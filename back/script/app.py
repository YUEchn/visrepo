# -*- coding: utf-8 -*-
import re
from flask import Flask, request
from flask_cors import CORS
import logging
import copy
from logging.handlers import RotatingFileHandler
import hashlib
from elasticsearch import Elasticsearch
from elasticsearch import helpers
from collections import Counter
from functools import partial
import threading
from nltk.stem.porter import PorterStemmer
import clustering as clustering
import base64
from zipfile import ZipFile
# 用于计算项目之间的相似性
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


from textProcess.TextPreprocessor import TextPreprocessor
from textProcess.MyBerTopic import MyBerTopic
from textProcess.SourceCodeParser import SourceCodeAnalyzer


# 创建Flask实例
app = Flask(__name__)
app.jinja_env.auto_reload = True
app.config['TEMPLATES_AUTO_RELOAD'] = True
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})
cors = CORS(app)
porter_stemmer = PorterStemmer()

# 执行一次查询之后后端保存一次映射结果
g_result = {}            # 保存原始的查询结果
g_list_result = {}       # 保存过滤后的列表数据
g_all_list_result = {}   # 保存初次查询后的完整列表数据
g_my_bert_topic = None
g_included_repoId = []   # 经过过滤后保留下来的项目的id
hits = None
g_query = []

# 在上一次的基础上查询，只需要记住上一次的所有项目的id，然后限定查询范围即可
class SearchEngine:
    def __init__(self):
        self.index = "vis_repo_engine_2024"
        self.ip = "http://localhost:9200"
        self.es = Elasticsearch(self.ip).options(ignore_status=400)

    def execute_search(self, query):
        print('**********开始查询: ', query)
        query_pattern = {
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": [
                        "repoName",
                        "topics",
                        "description",
                        # "readme"    # readme是新增的
                        # "usefulReadme"    # readme是新增的
                    ]
                }
            },
            "highlight": {
                "pre_tags": "<em>",
                "post_tags": "</em>",
                "fields": {
                    "repoName": {},
                    "topics": {},
                    "description": {},
                    # "readme": {}
                    # "usefulReadme": {}
                }
            },
            "size":1000,   # 只返回前1000条数据
            "explain": True
        }
        # resp_repos = helpers.scan(self.es, query_pattern, index=self.index, scroll="10m")  # 执行大规模查询
        resp_repos = self.es.search(index=self.index, body=query_pattern)
        print('**********查询结束**********')
        return resp_repos

    def execute_repo_search(self, repo_id):
        print('**********开始查询仓库信息', repo_id)
        query_pattern = {
            "query": {
                "bool": {
                    "must": {
                        "match_phrase": {    # 返回完全匹配的内容
                            "repoId": repo_id
                        }
                    }
                }
            },
            "highlight": {
                "pre_tags": "<em>",
                "post_tags": "</em>",
                "fields": {
                    "repoId": {}
                }
            }
        }
        resp_repo_info = helpers.scan(self.es, query_pattern, index=self.index, scroll="10m")
        res = {}
        for hit in resp_repo_info:
            res = hit['_source']
            res['highlight'] = hit['highlight']
        print('**********仓库信息查询结束')
        return res 

    # 查询相似主题的仓库
    def search_similar_repo(self, topics ,repo_id):
        print('**********开始查询相似仓库: ', repo_id)
        query_topics = {
                "query": {
                    "match": {
                        "topics": ','.join(topics)
                    }
                },
                "sort" : [
                    "_score"
                ],
                "size": 10    # 默认只返回前十条数据
            }
        resp_topics = self.es.search(index=self.index, body=query_topics)  # 查询相同的主题， 取前10个
        topic_repos = []
        for hit in resp_topics['hits']['hits']:
            content = hit['_source']
            if content['repoId'] != repo_id:
                topic_repos.append({"repoId": content['repoId'], "repoName": content['repoName'], "topics": content['topics'], "star": content['star'], "size": content['size'], "description": content['description']})
        
        print('**********相似仓库查询结束**********')
        return topic_repos

    # 查询相同作者和相同贡献者的仓库
    def search_related_repo(self, owner_name, contributors, repo_id):
        print('**********开始查询相关仓库: ', repo_id)
        query_owner = {
            "query": {
                "nested":{
                    "path": "owner",
                    "query": {
                        "bool":{
                            "must": [
                                {"match_phrase": {"owner.name": owner_name}}
                            ]
                        }
                    }
                }
            },
        }
        resp_owners = helpers.scan(self.es, query_owner, index=self.index, scroll="10m")
        owners_repo = []
        for hit in resp_owners:  # 查询当前作者的项目
            content = hit['_source']
            if content['repoId'] != repo_id:
                owners_repo.append({"repoId": content['repoId'], "repoName": content['repoName'], "topics": content['topics'], "star": content['star'], "size": content['size'], "description": content['description'], "usefulReadme": content['usefulReadme']})
        query_contributor = {
                "query": {
                    "match": {
                        "contributors": ','.join(contributors)
                    }
                },
                "sort" : [
                    "_score"
                ],
                "size": 10    # 默认只返回前十条数据
            }
        resp_contributors = self.es.search(index=self.index, body=query_contributor)  # 查询相同贡献者， 取前10个
        contributors_repo = []
        for hit in resp_contributors['hits']['hits']:
            content = hit['_source']
            if content['repoId'] != repo_id:
                contributors_repo.append({"repoId": content['repoId'], "repoName": content['repoName'], "topics": content['topics'], "star": content['star'], "size": content['size'], "description": content['description']})
        
        print('**********相关仓库查询结束**********')
        return owners_repo, contributors_repo
    
    def search_related_owner_repo(self, owner_name, repo_id):
        print('**********开始查询相同作者仓库: ', repo_id)
        query_owner = {
            "query": {
                "nested":{
                    "path": "owner",
                    "query": {
                        "bool":{
                            "must": [
                                {"match_phrase": {"owner.name": owner_name}}
                            ]
                        }
                    }
                }
            },
        }
        resp_owners = helpers.scan(self.es, query_owner, index=self.index)
        owners_repo = []
        for hit in resp_owners:  # 查询当前作者的项目
            content = hit['_source']
            if content['repoId'] != repo_id:
                owners_repo.append({"repoId": content['repoId'], "repoName": content['repoName'], "topics": content['topics'], "star": content['star'], "size": content['size'], "description": content['description'], "usefulReadme": content['usefulReadme'], "image": content['images']})
        return owners_repo
        # 查询相同作者和相同贡献者的仓库
    def search_related_ctrs_repo(self, contributors, repo_id):
        print('**********开始查询相同贡献者仓库: ', repo_id)
        query_contributor = {
                "query": {
                    "nested": {
                        "path": "contributors",
                        "query": {
                            "bool": {
                            "should": contributors
                            }
                        }
                    }
                },
                "sort" : [
                    "_score"
                ],
                # "size": 10    # 默认只返回前十条数据
        }
        resp_contributors = self.es.search(index=self.index, body=query_contributor)
        contributors_repo = []
        for hit in resp_contributors['hits']['hits']:
            content = hit['_source']
            if content['repoId'] != repo_id:
                contributors_repo.append({"repoId": content['repoId'], "repoName": content['repoName'], "usefulReadme": content['usefulReadme'], "image": content['images'], "topics": content['topics'], "star": content['star'], "size": content['size'], "description": content['description']})
        
        print('**********相关仓库查询结束**********')
        return contributors_repo
    
    
    # 查询指定id的项目的信息
    def search_specified_repo(self, query, repo_ids):
        # 构建查询体
        query = {
            "query": {
                "bool":{
                    "filter": {
                        "terms": {
                            "repoId": repo_ids
                        }
                    },
                    "must": [
                        {
                        "multi_match": {
                        "query": query,
                        "fields": [
                            "repoName",
                            "topics",
                            "description",
                            # "readme"    # readme是新增的
                            # "usefulReadme"    # readme是新增的
                        ]
                        }
                    }]
                }
            },
            "highlight": {
                "pre_tags": "<em>",
                "post_tags": "</em>",
                "fields": {
                    "repoName": {},
                    "topics": {},
                    "description": {},
                    # "readme": {}
                    # "usefulReadme": {}
                }
            },
            "explain": True
        }
        # 发送查询请求
        result = self.es.search(index=self.index, body=query)   
        return result

# 重写多线程，获取返回值
class MyThread(threading.Thread):
    def __init__(self, func, args=()):
        super(MyThread, self).__init__()
        self.func = func
        self.args = args

    def run(self):
        self.result = self.func(*self.args)

    def get_result(self):
        try:
            return self.result
        except Exception:
            return None

'''
计算字符串的匹配模式，es只会匹配原始的和大小写
:params single_match highlight匹配项数组的一个元素
:params query_arr 拆分成数组的前端查询语句
'''
def calMatchOrder(single_match, query_arr):
    search_results = re.finditer(r'\<em>.*?\</em>', single_match)
    match_index = []
    for item in search_results:
        # # 词干化
        # curItem = porter_stemmer.stem(item.group(0).replace('<em>', '').replace('</em>', '').strip().lower())
        # 不进行词干化
        curItem = item.group(0).replace('<em>', '').replace('</em>', '').strip().lower()
        try:
            curIndex = query_arr.index(curItem)
            match_index.append(curIndex)
        except Exception as e:
            print(str(e), query_arr)
    if len(list(set(match_index))) == 1:  # 1. [2, 2, 2] ---> [2]
        return [match_index[0]]
    return match_index


'''
找到匹配模式序列中的重复子序列作为最终的匹配序列
:params s: 要删除重复子序列的数组
'''
def repeatedSubstringPattern(s):
    def kmp(query, pattern):
        n, m = len(query), len(pattern)
        fail = [-1] * m
        for i in range(1, m):
            j = fail[i - 1]
            while j != -1 and pattern[j + 1] != pattern[i]:
                j = fail[j]
            if pattern[j + 1] == pattern[i]:
                fail[i] = j + 1
        match = -1
        for i in range(1, n - 1):
            while match != -1 and pattern[match + 1] != query[i]:
                match = fail[match]
            if pattern[match + 1] == query[i]:
                match += 1
                if match == m - 1:
                    return [int(x) for x in pattern[fail[-1] + 1:].split('_')[1:]]
        return [int(x) for x in pattern.split('_')[1:]]

    return kmp(s + s, s)


'''
:params explains:得分的详细情况
:params highlight:命中搜索词的选项
:params query_arr:查询拆分后的数组
:return match_pattern_last: 最终的匹配模式[index1, index2, indexn]
:return match_field: 用于计算匹配模式的项
'''
def calMatchPattern(explain_details, highlight, query_arr):
    # 第一步：找最大score对应的field
    if explain_details[0]['description'] == "sum of:":
        explains_sorted = sorted(explain_details, key=lambda x: (-x['value'], re.findall(r"weight[(](.+?):", x['details'][0]['description'])[0]))
        match_field = re.findall(r"weight[(](.+?):", explains_sorted[0]['details'][0]['description'])[0]   # 最大得分项
    else:
        explains_sorted = sorted(explain_details, key=lambda x: (-x['value'], re.findall(r"weight[(](.+?):", x['description'])[0]))
        match_field = re.findall(r"weight[(](.+?):", explains_sorted[0]['description'])[0]   # 最大得分项

    # 第二步：找到最大评分对应的field并计算匹配模式
    match_pattern = []  # 多维数组
    match_pattern_one_dim = []  # 一维数组
    match_pattern += list(map(partial(calMatchOrder, query_arr=query_arr), highlight[match_field]))  # [[...], [...], [...]]：[[0], [0, 3, 3], [0, 1, 3], [0, 4], [0]]

    match_pattern_one_dim = sum(match_pattern, [])  # 2. [[2, 1], [2, 1]] ---> [2, 1, 2, 1]
    if match_field == 'topics':   # 对于topic直接去重
        match_pattern_last = sorted(list(set(match_pattern_one_dim)))
    else:    # 对于长内容的，删除重复的模式
        match_pattern_last = repeatedSubstringPattern('_' + '_'.join(str(i) for i in match_pattern_one_dim))  # [2,1,0,2,1,0] ---> [2,1,0]

    return match_pattern_last, match_field


# 执行查询过程
'''
: params query查询语句
: params mode是否根据单词的匹配模式对搜索结果进行分类，无论是否分类，都会计算匹配模式
: return 查询的返回结果
'''
@app.route("/search/<query>/<within_result>", methods=['POST', 'GET'])
def search(query, within_result):

    # 全局保存查询词
    global g_query
    g_query = query.split(' ')

    # 记录日志
    app.logger.info("query: *" + query + "*")
    # 记录结果hit['_source']
    app.logger.info("result: \n")
    
    es = SearchEngine()
    global g_result
    if within_result == 'true':   # 如果在限定的结果中执行搜索
        needed_repoIds = []
        for r in g_result:
            needed_repoIds.append(g_result[r]['repoId'])
        hits = es.search_specified_repo(query, needed_repoIds)

    else:
        hits = es.execute_search(query)
    respond = []   # 数据库查询结果
    exist_hash = []   # 避免加入重复的项目数据

    # 不进行词干化
    # query_arr = list(map(lambda x: x, query.strip().lower().split(' ')))  # 将输入的文本转为数组
    
    query_arr = re.split(r' +|-', query)   # 按照空格和-字符将输入的文本转为数组
    # 根据匹配模式的分组
    g_result = {}       # 保存第一次查询的完整结果
    # 过滤条件的数据，记录每个月有多少条数据
    time_bar_dt = {
        "2010/01": 0,
        "2010/02": 0,
        "2010/03": 0,
        "2010/04": 0,
        "2010/05": 0,
        "2010/06": 0,
        "2010/07": 0,
        "2010/08": 0,
        "2010/09": 0,
        "2010/10": 0,
        "2010/11": 0,
        "2010/12": 0,
        "2011/01": 0,
        "2011/02": 0,
        "2011/03": 0,
        "2011/04": 0,
        "2011/05": 0,
        "2011/06": 0,
        "2011/07": 0,
        "2011/08": 0,
        "2011/09": 0,
        "2011/10": 0,
        "2011/11": 0,
        "2011/12": 0,
        "2012/01": 0,
        "2012/02": 0,
        "2012/03": 0,
        "2012/04": 0,
        "2012/05": 0,
        "2012/06": 0,
        "2012/07": 0,
        "2012/08": 0,
        "2012/09": 0,
        "2012/10": 0,
        "2012/11": 0,
        "2012/12": 0,
        "2013/01": 0,
        "2013/02": 0,
        "2013/03": 0,
        "2013/04": 0,
        "2013/05": 0,
        "2013/06": 0,
        "2013/07": 0,
        "2013/08": 0,
        "2013/09": 0,
        "2013/10": 0,
        "2013/11": 0,
        "2013/12": 0,
        "2014/01": 0,
        "2014/02": 0,
        "2014/03": 0,
        "2014/04": 0,
        "2014/05": 0,
        "2014/06": 0,
        "2014/07": 0,
        "2014/08": 0,
        "2014/09": 0,
        "2014/10": 0,
        "2014/11": 0,
        "2014/12": 0,
        "2015/01": 0,
        "2015/02": 0,
        "2015/03": 0,
        "2015/04": 0,
        "2015/05": 0,
        "2015/06": 0,
        "2015/07": 0,
        "2015/08": 0,
        "2015/09": 0,
        "2015/10": 0,
        "2015/11": 0,
        "2015/12": 0,
        "2016/01": 0,
        "2016/02": 0,
        "2016/03": 0,
        "2016/04": 0,
        "2016/05": 0,
        "2016/06": 0,
        "2016/07": 0,
        "2016/08": 0,
        "2016/09": 0,
        "2016/10": 0,
        "2016/11": 0,
        "2016/12": 0,
        "2017/01": 0,
        "2017/02": 0,
        "2017/03": 0,
        "2017/04": 0,
        "2017/05": 0,
        "2017/06": 0,
        "2017/07": 0,
        "2017/08": 0,
        "2017/09": 0,
        "2017/10": 0,
        "2017/11": 0,
        "2017/12": 0,
        "2018/01": 0,
        "2018/02": 0,
        "2018/03": 0,
        "2018/04": 0,
        "2018/05": 0,
        "2018/06": 0,
        "2018/07": 0,
        "2018/08": 0,
        "2018/09": 0,
        "2018/10": 0,
        "2018/11": 0,
        "2018/12": 0,
        "2019/01": 0,
        "2019/02": 0,
        "2019/03": 0,
        "2019/04": 0,
        "2019/05": 0,
        "2019/06": 0,
        "2019/07": 0,
        "2019/08": 0,
        "2019/09": 0,
        "2019/10": 0,
        "2019/11": 0,
        "2019/12": 0,
        "2020/01": 0,
        "2020/02": 0,
        "2020/03": 0,
        "2020/04": 0,
        "2020/05": 0,
        "2020/06": 0,
        "2020/07": 0,
        "2020/08": 0,
        "2020/09": 0,
        "2020/10": 0,
        "2020/11": 0,
        "2020/12": 0,
        "2021/01": 0,
        "2021/02": 0,
        "2021/03": 0,
        "2021/04": 0,
        "2021/05": 0,
        "2021/06": 0,
        "2021/07": 0,
        "2021/08": 0,
        "2021/09": 0,
        "2021/10": 0,
        "2021/11": 0,
        "2021/12": 0,
        "2022/01": 0,
        "2022/02": 0,
        "2022/03": 0,
        "2022/04": 0,
        "2022/05": 0,
        "2022/06": 0,
        "2022/07": 0,
        "2022/08": 0,
        "2022/09": 0,
        "2022/10": 0,
        "2022/11": 0,
        "2022/12": 0,
        "2023/01": 0,
        "2023/02": 0,
        "2023/03": 0,
        "2023/04": 0,
        "2023/05": 0,
        "2023/06": 0,
        "2023/07": 0,
        "2023/08": 0,
        "2023/09": 0,
        "2023/10": 0,
        "2023/11": 0,
        "2023/12": 0,
        "2024/01": 0,
    }
    total_techs_arr = []
    star = [float('inf'), 0]
    watch = [float('inf'), 0]
    fork = [float('inf'), 0]
    rank_number = 0
    global g_included_repoId
    for hit in hits['hits']['hits']:  # 采用search的方式
        content = hit['_source']
        repo_id = hit['_source']['repoName']
        score = hit['_explanation']['value']
        content['score'] = score
        content['highlight'] = hit['highlight']
        content['rankId'] = rank_number
        content['explanation_details'] = hit['_explanation']['details'][0]['details']
        hash_val = hashlib.md5(repo_id.encode('utf-8')).digest()
        if hash_val not in exist_hash:
            exist_hash.append(hash_val)
            respond.append(content)
            rank_number += 1
            g_result[content['repoId']] = content   # 会添加上后面的主题信息
            curTime = content['updatedAt'][0:7].replace('-', '/')   # 提取时间格式
            time_bar_dt[curTime] += 1
            star[0] = min(star[0], content['star'])
            star[1] = max(star[1], content['star'])
            watch[0] = min(watch[0], content['watch'])
            watch[1] = max(watch[1], content['watch'])
            fork[0] = min(fork[0], content['fork'])
            fork[1] = max(fork[1], content['fork'])
            total_techs_arr += content['techs']['tech']
            g_included_repoId.append(content['repoId'])
    
    # 同步进行主题建模和匹配模式计算
    topic_model_thread = MyThread(topic_model, args=(respond,))
    matching_pattern_thread = MyThread(matching_pattern_calculating, args=(respond, query_arr))
    tech_tree_thread = MyThread(construct_tech_hierarchy, args=(total_techs_arr,))  # 不去重，计算每种技术使用的次数
    topic_model_thread.start()   # 启动线程
    matching_pattern_thread.start()
    tech_tree_thread.start()
    topic_model_thread.join()   # 等待两个线程执行完毕
    matching_pattern_thread.join() 
    tech_tree_thread.join() 
    try:
        hier_topics_json, repo_to_topic, global_total_words, topics_overview = topic_model_thread.get_result()   # 主题建模的执行结果
    except Exception as e:
        hier_topics_json = {}  # 主图的层次结构树
        repo_to_topic = {}  # repoId和topicId之间的映射关系
        global_total_words = []  # 主图的主题词搜索框的选项
        topics_overview = []   # 主图的全局主题词的概览
        print(str(e))
    repos, matchingOrderDt = matching_pattern_thread.get_result()   # 匹配模式的计算结果
    total_techs_tree_arr, max_number = tech_tree_thread.get_result()   # 技术依赖分类的结果
    
    print('**********开始合并主题和匹配模式')
    for repo in repos:
        if repo['repoId'] in repo_to_topic.keys():
            repo['topicId'] = repo_to_topic[repo['repoId']]
        else:
            repo['topicId'] = -1
                
    print('**********结果查询结束**********')
    global g_list_result
    g_list_result = copy.deepcopy(repos)   # 用来保存被过滤后的数据
    global g_all_list_result
    g_all_list_result = repos
    
    # return {"listData": {"maxStar": star[1], "maxFork": fork[1], "maxWatch": watch[1], "listDt": repos}, 'topicModelFilterOption': {"searchTopicsDt": []}, 'topicModelData': {}, "filterOption":{"timeBar": time_bar_dt, "starRange": star, "watchRange": watch, "forkRange": fork, "matchingOrderDt": []}}

    return {"listData": {"maxStar": star[1], "maxFork": fork[1], "maxWatch": watch[1], "listDt": repos}, "searchTopicsDt": global_total_words, 'topicsOverview': topics_overview, 'topicModelData': hier_topics_json, "filterOption":{"timeBar": time_bar_dt, "starRange": star, "watchRange": watch, "forkRange": fork, "matchingOrderDt": matchingOrderDt, 'total_techs_tree_arr': {"max_number": max_number, "data": total_techs_tree_arr}}}

"""
func: 执行层次主题建模
:params repos: 从数据库查询得到的原始项目信息
:return hier_topics_json: 项目主题的层次信息，每个节点包含了id(topic的id)/topic/type/children属性
:return repo_to_topic: 每个项目所属的主题id {repo_id: topic_id, xxx}
"""
def topic_model(repos):
    index_to_repoID = []  # 将项目id映射到数组的位置索引[repo_id, repo_id, xxx]
    docs = []
    for repo in repos:
        index_to_repoID.append(repo['repoId'])
        mergedStr= '. '.join(s if s is not None else '' for s in [repo['repoName'], repo['description'], repo['usefulReadme']]) # 提取项目标题、描述和有用的radme文本片段
        docs.append(mergedStr)
        
    print('**********开始进行主题建模')
    text_processor = TextPreprocessor(True)
    # 处理干净后的文本
    processed_docs = [text_processor.process_text(text) for text in docs]
    
    # 创建 my_bert_topic 实例，这里对比处理后的和处理前的
    global g_my_bert_topic, g_query
    g_my_bert_topic = MyBerTopic(processed_docs, index_to_repoID, g_query)
    # 训练 berTopic 模型
    g_my_bert_topic.train_bertopic_model()
    
    # 构建层次主题
    hier_topics_json={}
    g_my_bert_topic.get_hiera_topics()
    hier_topics_json, global_total_words = g_my_bert_topic.processTopicTree()
    
    # 获取每个文档的主题信息
    repo_to_topic = {}
    topic_mapping = g_my_bert_topic.get_all_doc_topic()
    for repo_id in topic_mapping:
        repo_to_topic[index_to_repoID[repo_id]] = topic_mapping[repo_id]

    # 获取主题的在所有文档中的概览信息
    topics_overview = g_my_bert_topic.get_all_topics_to_all_repoIds()
    
    print('**********主题建模完成**********')
    return hier_topics_json, repo_to_topic, global_total_words, topics_overview

"""
func: 计算每个仓库的查询词匹配模式
:return repos 完整的项目查询信息，补全了匹配模式和匹配的字段
"""
def matching_pattern_calculating(repos, query_arr):
    print('**********开始计算匹配模式')
    matchingOrderDt = []   # 记录所有的匹配顺序
    for repo in repos:
        temp_match_pattern, match_field = calMatchPattern(repo['explanation_details'], repo['highlight'], query_arr)
        if len(temp_match_pattern) == 0:
            temp_match_pattern = [-1]
        # maxLength = max(maxLength, len(temp_match_pattern))  # 更新最长的匹配模式
        repo['match_type'] = temp_match_pattern   # 记录当前仓库的匹配模式
        repo['match_field'] = match_field   # 记录当前仓库的匹配项
        matchingOrderDt.append('-'.join(map(str, temp_match_pattern)))
        del repo['explanation_details']  # 删除无用的key-value
    print('**********匹配模式计算完成**********')
    
    return repos, sorted(set(matchingOrderDt), key=len)
    
"""
func: 获取所有项目的技术依赖，并构造层次结构
:params 技术依赖的数组 [xx, xxx, xxx]，没有重的
：return tech_hierarchy_json 
    [
        {
            "@eslint": {
            "title": "@eslint/plugin-react-hooks",
            "key": "@eslint/plugin-react-hooks",
            "children": [
                {
                    "title": "@eslint/plugin-react-hooks",
                    "key": "@eslint/plugin-react-hooks"
                },...
            ]
         }
    ]
"""
def construct_tech_hierarchy(technologies):
    tech_word_count = Counter(technologies)  # 计算每一个词出现的次数 {'apple': 3, 'banana': 2, 'orange': 2}

    tech_hierarchy_json = {}
    max_number = 0

    # 循环去重后的数组
    for tech in list(set(technologies)):
        noProcessed = True
        
        for m in ['/', '-']:
            if not noProcessed:
                break
            parts = tech.split(m, 1)  # 仅切分一次
            
            if len(parts) == 2:
                noProcessed = False  # 已经处理过了
                parent = parts[0]
                parent = parent.lower()
                cur_tech_times = tech_word_count[tech]
                child_node = {"title": tech, "key": tech, "number": cur_tech_times}
                if parent in tech_hierarchy_json.keys():
                    tech_hierarchy_json[parent]['children'].append(child_node)
                    tech_hierarchy_json[parent]['number'] += cur_tech_times
                    max_number = max(max_number, tech_hierarchy_json[parent]['number'])
                else:
                    tech_hierarchy_json[parent] = {"title": parent, "key": '$' + parent, "children": [child_node], "number": cur_tech_times}
                    max_number = max(max_number, cur_tech_times)
                
        if noProcessed:
            tech_hierarchy_json[tech] = {"title": tech, "key": tech, "children": [], "number": tech_word_count[tech]}
            max_number = max(max_number, tech_word_count[tech])
    return list(sorted(tech_hierarchy_json.values(), key = lambda i: i['title'])), max_number

"""
 func：获取某个特定主题的主题信息

 :return 当前节点的所有keywords
 :return 
"""
@app.route("/topic_cluster", methods=['POST', 'GET'])
def get_topic_cluster():
    print('**********开始获取topic cluster数据')
    post_json = request.json
    topic_id = post_json['topic_id']
    included_topicIds = post_json['included_topicIds']
    topic_type = post_json['topic_type']

    global g_my_bert_topic, g_included_repoId
    repo_ids = g_my_bert_topic.get_topic_to_repo(topic_id, included_topicIds, g_included_repoId)  # 当前(merged和origin都有)主题包含的repoId  ["4360_flowerers", "39186_custom_visualizations"]

    # 初始化统计数据
    listDt = []
    repo_data = []
    subclassDt = {}
    max_star = max_fork = max_watch = float('-inf')
    languages = []
    techs = []
    # 遍历查询结果，在过滤后的结果中遍历
    global g_list_result
    for hit in g_list_result:
        cur_repo_id = hit['repoId']
        if cur_repo_id in repo_ids:   # 当前项目在
            star = hit['star']
            fork = hit['fork']
            watch = hit['watch']
            language = list(map(lambda x:x['name'].lower(), hit['language']))   # [xx, xx, xx]
            tech = list(map(lambda x:x.lower(), hit['techs']['tech']))   # [xx, xx, xx]
            repo_data.append({
                "id": hit['repoId'],
                "repoName": hit['repoName'],
                "star": star,
                "score": g_result[hit['repoId']]['score'],
                "date": hit['updatedAt'][0:7],
                "fork": fork,
                "watch": watch,
                "language": language,
                "tech": tech
            })

            # 更新最大值
            max_star = max(max_star, star)
            max_fork = max(max_fork, fork)
            max_watch = max(max_watch, watch)

            # 添加语言和技术到集合中
            languages += language
            techs += tech

            # 将数据添加到list的里面
            listDt.append(hit)

    # 使用Counter类进行计数
    language_counts = Counter(languages)
    tech_counts = Counter(techs)

    # 将统计结果转换为所需的格式
    language_times = [[l, c] for l, c in language_counts.items()]
    tech_times = [[t, c] for t, c in tech_counts.items()]
    subclassDt = {
        "languageDt": language_times,
        "techDt": tech_times
    }


    # print('过滤前后的结果数据数量', len(g_all_list_result), len(g_list_result))

    # 获取主题树的数据，目前只获取叶子节点的
    topic_keywords = g_my_bert_topic.get_all_topic_words(topic_id, topic_type, g_included_repoId)

    print('topic cluster数据获取结束')
    return { "starMin": 0, "starMax": max_star, "forkMin": 0, "forkMax": max_fork, "watchMin": 0, "watchMax": max_watch, "data": repo_data, "subclassDt": subclassDt, "topicKeywords": topic_keywords, "listDt": listDt }

"""
根据设置的min_topic_size调整进行新的主题模型过程，所有的主题建模数据都被更新
"""
@app.route("/adjust_min_topic_size_model/<min_topic_size>", methods=['POST', 'GET'])
def adjust_min_topic_size_model(min_topic_size):
    index_to_repoID = []  # 将项目id映射到数组的位置索引[repo_id, repo_id, xxx]
    docs = []
    max_star = max_fork = max_watch = float('-inf')
    global g_list_result
    for repo in g_list_result:  # 在当前处理过的数据中进行新的过滤
        # 更新最大值
        max_star = max(max_star, repo['star'])
        max_fork = max(max_fork, repo['fork'])
        max_watch = max(max_watch, repo['watch'])
        index_to_repoID.append(repo['repoId'])
        docs.append(repo['repoName'] + '. ' + str(repo['description']) + '. ' + str(repo['usefulReadme']))
        
    print('**********开始进行主题建模')
    text_processor = TextPreprocessor(True)
    # 处理干净后的文本
    processed_docs = [text_processor.process_text(text) for text in docs]

    print('min_topic_size', min_topic_size, type(min_topic_size))
    # 创建 my_bert_topic 实例，这里对比处理后的和处理前的
    global g_my_bert_topic, g_query
    g_my_bert_topic = None
    g_my_bert_topic = MyBerTopic(processed_docs, index_to_repoID, g_query)
    # 训练 berTopic 模型
    g_my_bert_topic.train_bertopic_model(int(min_topic_size))
    
    # 构建层次主题
    hier_topics_json={}
    g_my_bert_topic.get_hiera_topics()
    hier_topics_json, global_total_words = g_my_bert_topic.processTopicTree()
    
    # 获取每个文档的主题信息
    repo_to_topic = {}
    topic_mapping = g_my_bert_topic.get_all_doc_topic()
    for repo_id in topic_mapping:
        repo_to_topic[index_to_repoID[repo_id]] = topic_mapping[repo_id]
        
    print('**********合并新主题到原始的项目中')
    # 更新每个列表元素的主题信息
    for repo in g_list_result:
        repo['topicId'] = repo_to_topic[repo['repoId']]

    # 获取主题的概览信息
    topics_overview = g_my_bert_topic.get_all_topics_to_all_repoIds()

    print('**********新的主题建模结束')

    return {"listData": {"listDt": g_list_result, "maxFork": max_fork, "maxStar": max_star, "maxWatch": max_watch}, 'topicModelData': hier_topics_json, "searchTopicsDt": global_total_words, "topicsOverview": topics_overview}

##################################以下与单个项目信息查询相关的内容###############################
# 获取指定仓库的数据
@app.route("/get_single_repo_info/<repo_id>/", methods=['POST', 'GET'])
def get_single_repo_info(repo_id):
    # 执行查询
    es = SearchEngine()
    in_list = True
    global g_result
    if repo_id in g_result.keys():   # 当前选择的仓库在查询结果中
        curRepoJson = copy.deepcopy(g_result[repo_id])
    else:
        curRepoJson = es.execute_repo_search(repo_id)
        in_list = False
        
    # 项目源文件路径
    # root = 'G:/A2023/originVisRepos/'  # 仓库文件的路径
    root = 'H:/A2023/originVisRepos/'  # 仓库文件的路径
    repo_index = repo_id.split('_', 1)[0]
    folder = get_folder(repo_index)
    file_path = root + folder + '/' + repo_index + '.zip'
    # 读取文件的目录结构
    
    # 同步进行获取文件结构和词云以及推荐的内容
    directory_thread = MyThread(read_zip_directory, args=(file_path,))
    variablesWordCloud_thread = MyThread(get_wordcloud_for_repo, args=(file_path,))
    similarAndRelatedRepo_thread = MyThread(get_similar_and_related_repo, args=(curRepoJson,in_list,))
    directory_thread.start()   # 启动线程
    variablesWordCloud_thread.start()
    similarAndRelatedRepo_thread.start()
    directory_thread.join()   # 等待两个线程执行完毕
    variablesWordCloud_thread.join() 
    similarAndRelatedRepo_thread.join() 
    directory, folders, files, max_depth  = directory_thread.get_result()   # 主题建模的执行结果
    variablesWordCloud = variablesWordCloud_thread.get_result()   # 匹配模式的计算结果
    sorted_owners_repo, sorted_ctrs_repo, sorted_similar_topic_repo = similarAndRelatedRepo_thread.get_result()   # 相关和相似项目的计算结果
    
    # 整理变量信息
    folders_json = []
    for i in folders:
        clean_f = list(set(folders[i]))
        folders_json.append({"name": i.rsplit('/', 1)[0], "value": len(clean_f), "filDir": clean_f})
    
    files_json = []
    for i in files:
        clean_f = list(set(files[i]))
        files_json.append({"name": i, "value": len(clean_f), "filDir": clean_f})
    print('*********************但项目信息查询结束')
    return {"basicInfo": curRepoJson, "directory": directory, "variablesWordCloud": {"folder": folders_json, "file": files_json, "function": variablesWordCloud['function'], "var": variablesWordCloud['var']}, "recommandRepo": {'related_owner': sorted_owners_repo, 'related_contirbutor': sorted_ctrs_repo, 'similar_topic': sorted_similar_topic_repo}}

    # return {"basicInfo": curRepoJson, "directory": directory, "variablesWordCloud": variablesWordCloud, "recommandRepo": {}}

'''
查询单个仓库的数据，需要用到es查询
:params repo_id 查询仓库的id，格式：编号_reponame
'''
@app.route("/get_repo_info/<repo_id>", methods=['POST', 'GET'])
def get_repo_info(repo_id):
    # 记录日志
    app.logger.info("query repoId: *" + repo_id + "*")
    # 执行查询
    es = SearchEngine()
    global g_result
    if repo_id in g_result.keys():   # 当前选择的仓库在查询结果中
        curRepoJson = copy.deepcopy(g_result[repo_id])
    else:
        curRepoJson = es.execute_repo_search(repo_id)
    # 读取文件的目录结构
    directory = read_zip_directory(repo_id.split('_')[0])
    curRepoJson['directory'] = directory

    # 查询相关和相似的项目
    owners_repo, contributors_repo= es.search_related_repo(curRepoJson['owner']['name'], curRepoJson['contributors'], repo_id)
    topic_repos = es.search_similar_repo(curRepoJson['topics'], repo_id)
    return {"data": curRepoJson, "related_owner": owners_repo, "related_cond": contributors_repo, "similar": topic_repos}


@app.route("/get_source_code/<filename>/<repo_id>", methods=['POST', 'GET'])
def get_source_code(filename, repo_id):
    file_dir = filename.replace('*', '/')
    # root = 'G:/A2023/originVisRepos/'  # 仓库文件的路径
    root = 'H:/A2023/originVisRepos/'  # 仓库文件的路径
    folder = get_folder(repo_id.split('_', 1)[0])
    file_path = root + folder + '/' + repo_id.split('_', 1)[0] + '.zip'
    print(file_dir, repo_id)
    file_content = ""
    
    # 读取zip中的文件
    with ZipFile(file_path) as z:
        for zip_file in z.namelist():
            try:
                new_zip_file = zip_file.encode('cp437').decode('gbk')  # 转换编码格式，让中文正确显示  0/test/res.set.js
                cur_filename = new_zip_file.split('/', 1)[1]  # 不包含根路径   test/res.set.js
                if cur_filename == file_dir:
                    file_content = z.read(zip_file)
                    break

            except Exception as e:
                print(cur_filename)
                print('--------------------出错了', str(e))

    # 不能直接传递bytes数据
    return {"fileContent": base64.b64encode(file_content).decode()}

# 获取当前文件所在得文件夹
def get_folder(repo_index):
    folder = ''
    if 0 <= int(repo_index) <10000:
        folder = '0-9999'
    elif 10000 <= int(repo_index) <20000:
        folder = '10000-19999'
    elif 20000 <= int(repo_index) <30000:
        folder = '20000-29999'
    elif 30000 <= int(repo_index) <40000:
        folder = '30000-39999'
    elif 40000 <= int(repo_index) <50000:
        folder = '40000-49999'
    elif 50000 <= int(repo_index) <60000:
        folder = '50000-59999'
    elif 60000 <= int(repo_index) <70000:
        folder = '60000-69999'
    elif 70000 <= int(repo_index) <80000:
        folder = '70000-79999'
    return folder

# 读取文件目录获取层次结构
def read_zip_directory(file_path):
    print('开始读取文件目录')
    
    folders = {}
    files = {}

    test_path = 'C:/Users/CY/Desktop/2017.zip'
    res = {"name": 'root', "maxLOC": 0, "minLOC": float('inf'), "children": [], "dirDt": []}

    stack = ['?']
    max_depth = 0  # 记录文件的最大深度
    deep_number = {}   # 每一层的最后一个元素的index
    with ZipFile(file_path) as z:
        for zip_file in z.namelist():
            try:
                new_zip_file = zip_file.encode('cp437').decode('gbk')  # 转换编码格式，让中文正确显示  0/test/res.set.js
                filename = new_zip_file.split('/', 1)[1]  # 不包含根路径   test/res.set.js
                if '.git' not in filename and len(filename) != 0 and filename[0] != '.':  # 排除一些不重要的文件
                    if filename[-1] != '/':    # 当前是文件
                        curFileDepth = filename.count('/')  # 当前文件属于第几层
                        max_depth = max(max_depth, curFileDepth)
                        t = res
                        content_LOC = 0
                        if filename.split('.')[-1] in ['js', 'tsx', 'jsx', 'ts', 'css', 'html', 'sh', 'md']:
                            content_LOC = str(z.read(zip_file), encoding='utf8').replace('\\r\\n\\r\\n', '\\r\\n').replace('\\r\\r', '\\r').count('\n') 
                        res['maxLOC'] = max(res['maxLOC'], content_LOC)
                        res['minLOC'] = min(res['minLOC'], content_LOC)
                        if curFileDepth == 0:
                            t['children'].append({'name': filename.split('/')[-1], "fileDir": filename, "value": content_LOC})
                            t['dirDt'].append(content_LOC)
                            stack = ['?']
                            if filename.split('.')[-1] in ['js', 'tsx', 'jsx', 'ts']:
                                cur_filename = filename.split('/')[-1]
                                if cur_filename in files:
                                    files[cur_filename].append(filename)
                                else:
                                    files[cur_filename] = [filename]
                                
                        else:
                            for i in range(0,curFileDepth):
                                t = t['children'][-1]
                            t['children'].append({'name': filename.split('/')[-1], "fileDir": filename, "value": content_LOC})
                            t['dirDt'].append(content_LOC)
                            if filename.split('.')[-1] in ['js', 'tsx', 'jsx', 'ts']:
                                cur_filename = filename.split('/')[-1]
                                if cur_filename in files:
                                    files[cur_filename].append(filename)
                                else:
                                    files[cur_filename] = [filename]
                                    
                            while stack[-1].count('/') > curFileDepth:
                                stack.pop()
                    else:
                        curDepth = filename.count('/')   # 当前文件夹的深度
                        max_depth = max(max_depth, curDepth)
                        t = res
                        if curDepth == 0:
                            t['children'].append({'name': filename.split('/')[-2], "fileDir": filename, "children": [], "dirDt": []})
                            t['dirDt'].append(-1)
                            stack = ['?']
                            
                            cur_filename = filename.split('/')[-2]
                            if cur_filename in folders:
                                folders[cur_filename].append(filename)
                            else:
                                folders[cur_filename] = [filename]
                        else:
                            for i in range(0,curDepth-1):
                                t = t['children'][-1]
                            t['children'].append({'name': filename.split('/')[-2], "fileDir": filename, "children": [], "dirDt": []})
                            t['dirDt'].append(-1)
                            
                            cur_filename = filename.split('/')[-2]
                            if cur_filename in folders:
                                folders[cur_filename].append(filename)
                            else:
                                folders[cur_filename] = [filename]
                                
                            while stack[-1].count('/') >= curDepth:
                                stack.pop()
                            stack.append(filename)

            except Exception as e:
                print(zip_file, '--------------------出错了', str(e))
    print('结束读取文件目录')
    return res, folders, files, max_depth

    
# 读取项目的js/ts文件，获取一些重要的变量名和函数名
def get_wordcloud_for_repo(zip_file_path, similarity_threshold = 1):
    codeAnalyzer = SourceCodeAnalyzer(zip_file_path)
    codeAnalyzer.analyze()   # 提取变量名
    print('**********组织词云结构***********')
    wordcloud = codeAnalyzer.calWordsFreny(similarity_threshold)  # 相似性阈值默认是1，即不合并长得像的
    return wordcloud
    
"""
func 计算与一个给定项目相似和相关的其他项目
:param curRepo 当前项目的信息
"""
def get_similar_and_related_repo(curRepo,in_list):
    global g_result
    
    es = SearchEngine()
    # 1.查询作者相关和贡献者相关的数据
    owners_repo = es.search_related_owner_repo(curRepo['owner']['name'], curRepo['repoId'])
    
    # 2.获取当前项目的其他贡献者
    curCtrs = []
    first_three_ctrs = []   # 默认是贡献量降序，如果都没有很大贡献量的，就取前三个
    for ctr in curRepo['contributors']:
        if len(first_three_ctrs) <= 3:
            first_three_ctrs.append({
              "term": {
                "contributors.name": ctr['name']
              }
            })
        if ctr['lines'] >= 10:  # 最低要给项目贡献10行代码
            curCtrs.append({
              "term": {
                "contributors.name": ctr['name']
              }
            })
    if len(curCtrs) == 0:
        curCtrs = first_three_ctrs
    ctrs_repo = es.search_related_ctrs_repo(curCtrs, curRepo['repoId'])

    # 3.计算每个项目和当前项目的相似性，进行排序(如果不存在其他数据，则不进行排序)
    sorted_owners_repo = [] if len(owners_repo)==0 else cal_repo_similarity(curRepo, owners_repo)
    sorted_ctrs_repo =  [] if len(ctrs_repo)==0 else cal_repo_similarity(curRepo, ctrs_repo)

    # 4. 查找与他相同主题的，通过计算与它相同主题的其他文档的主题词分布
    
    if in_list:   # 当前选择的仓库不在查询结果中，则直接返回空
        global g_my_bert_topic
        similar_topic_repoIds = g_my_bert_topic.get_similar_topic_words_repo(curRepo['repoId'], curRepo['topicId']) # 排好序的repoId的数组 [xx, xx, xx]
        # 只取前十条数据
        if len(similar_topic_repoIds) > 10:
            similar_topic_repoIds = similar_topic_repoIds[0: 10]     # 只取前十条数据
            
        sorted_similar_topic_repo = []
        
        for r in similar_topic_repoIds:     
            sorted_similar_topic_repo.append(g_result[r])
            
        curTopicId = curRepo['topicId']
        if curTopicId == -1:   # 当前主题是-1，就在当前主题的项目中进行相似性计算
            sorted_similar_topic_repo = [] if len(sorted_similar_topic_repo)== 0 else cal_repo_similarity(curRepo, sorted_similar_topic_repo, 'similar')

    else:
        sorted_similar_topic_repo = []
    return sorted_owners_repo, sorted_ctrs_repo, sorted_similar_topic_repo

"""
func 给定一个目标项目和一组其他项目，计算与目标项目之间的相似性，对其他项目进行排序
：return sorted_repo_list 排序后的其他项目列表
"""
def cal_repo_similarity(current_repo, related_repo_arr, type='related'):
    mergedStr='. '.join(s if s is not None else '' for s in [current_repo['repoName'], current_repo['description'], current_repo['usefulReadme']])
    corpus = [mergedStr]

    for repo in related_repo_arr:
        mergedStr='. '.join(s if s is not None else '' for s in [repo['repoName'], repo['description'], repo['usefulReadme']])
        corpus.append(mergedStr)
        
    # 先对文本进行预处理
    text_processor = TextPreprocessor(True)
    # 处理干净后的文本
    processed_corpus = [text_processor.process_text(text) for text in corpus]
    # 使用TF-IDF向量化文本
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(processed_corpus)  # 使用处理后的文本进行相似性计算

    # 计算余弦相似度
    similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])
    # 对相似度进行排序
    sorted_indices = similarities.argsort()[0][::-1]  # 从大到小排序
    # 打印排序后的项目信息
    sorted_repo_list = []
    
    global g_result
    for index in sorted_indices:
        if type == 'related':   # 相关性计算部分,加入主题id
            curRepoId = related_repo_arr[index]['repoId']
            if curRepoId in g_result.keys():
                related_repo_arr[index]['topicId'] = g_result[curRepoId]['topicId']
        sorted_repo_list.append(related_repo_arr[index])
    return sorted_repo_list

# 需要更新列表数据
# 不需要进行新的主题建模
# 在全局控制的里面过滤，要在全局查询的数据中过滤
# 更新后的数据保存在 g_list_data
@app.route("/result_filter", methods=['POST', 'GET'])
def result_filter():
    star = request.json['star']   # number 0
    watch = request.json['watch']   # number 0
    fork = request.json['fork']   # number 0
    date_range = request.json['dateRange']  # ['xx', 'xx']
    matching_order  = request.json['matchingOrder']   # ['xx-xx']
    filter_has_how  = request.json['filterHasHow']   # true / false，不同于python中的False、True
    filter_license  = request.json['filterLicense']   # true / false，不同于python中的False、True
    needed_techs = request.json['neededTechs']
    print('*********** 根据条件进行过滤：', star, watch, fork, date_range,matching_order, filter_has_how,  needed_techs, filter_license)
    # 先根据基本的数值过滤列表数据
    global g_all_list_result, g_list_result
    g_list_result = list(filter(lambda d: filter_number_func(d, int(star), int(watch), int(fork), date_range, matching_order, filter_has_how, needed_techs, filter_license), g_all_list_result))
        
    print(22222, len(g_list_result))

    maxFork = -1
    maxStar = -1
    maxWatch = -1
    global g_included_repoId  
    g_included_repoId = []
    for repo in g_list_result:
        g_included_repoId.append(repo['repoId'])
        maxFork = maxFork if maxFork > int(repo['fork']) else int(repo['fork'])
        maxWatch = maxWatch if maxWatch > int(repo['watch']) else int(repo['watch'])
        maxStar = maxStar if maxStar > int(repo['star']) else int(repo['star'])
        

    # 然后基于已有的项目id更新主题列表数据
    global g_my_bert_topic
    filter_hiera_json_node, searchTopicsDt = g_my_bert_topic.get_filter_hiera_json_node(g_included_repoId)
    
    # 获取每个主题词在文档中的出现次数
    topics_overview = g_my_bert_topic.get_filtered_topic_times(g_included_repoId, searchTopicsDt)
    print('***********过滤结束***************')
    
    return {"listData": {"listDt": g_list_result, "maxFork":maxFork ,"maxStar":maxStar, "maxWatch":maxWatch }, 'topicModelData': filter_hiera_json_node, "topicsOverview": topics_overview, "searchTopicsDt": searchTopicsDt}

def filter_number_func(d, star, watch, fork, date_range, matching_order, filter_has_how, needed_techs, filter_license):
    # matching_order如果为空，则表示不过滤匹配顺序
    return (filter_license == False or (filter_license == True and len(d['license'] != 0))) and (filter_has_how == False or (filter_has_how == True and d['hasHow'] == 'true')) and int(d['star'])>= star and int(d['watch'])>= watch and int(d['fork'])>= fork and (date_range[0] <= d['updatedAt'][0:7] <= date_range[1]) and (len(matching_order) == 0 or ('-').join([str(m) for m in d['match_type']]) in matching_order) and (len(needed_techs) == 0 or bool(set(needed_techs) & set(d['techs']['tech'])))
    
    # if filter_has_how == True:
    #     return d['hasHow'] == 'true' and int(d['star'])>= star and int(d['watch'])>= watch and int(d['fork'])>= fork and (date_range[0] <= d['updatedAt'][0:7] <= date_range[1]) and (len(matching_order) == 0 or ('-').join([str(m) for m in d['match_type']])== matching_order) and (len(needed_techs) == 0 or bool(set(needed_techs) & set(d['techs']['tech'])))
    # else:
    #     return int(d['star'])>= star and int(d['watch'])>= watch and int(d['fork'])>= fork and (date_range[0] <= d['updatedAt'][0:7] <= date_range[1]) and (len(matching_order) == 0 or ('-').join([str(m) for m in d['match_type']])== matching_order) and (len(needed_techs) == 0 or bool(set(needed_techs) & set(d['techs']['tech'])))

# 获取一个主题词相关的其他词
@app.route("/get_cooccurence_topic/<topicName>", methods=['POST', 'GET'])
def get_cooccurence_topic(topicName):
    print('*************查询关联性更高的前两个主题词***************')
    global g_my_bert_topic
    max_npmi_words = g_my_bert_topic.get_top_n_npmi(topicName, 'co')  # co表示基于共现进行计算，npmi表示基于npmi进行计算
    
    # max_npmi_words = g_my_bert_topic.get_top_n_npmi(topicName)  # co表示基于共现进行计算，npmi表示基于npmi进行计算
    
    # max_npmi_words = g_my_bert_topic.get_top_n_npmi(topicName, 'cus_npmi')  # co表示基于共现进行计算，npmi表示基于npmi进行计算
    
    print('*************查询结束***************')
    return {"npmiTopic": max_npmi_words}

# 返回全部的列表结果到前端
@app.route("/get_all_list_data", methods=['POST', 'GET'])
def get_all_list_data():
    listDt = []
    max_star = max_fork = max_watch = float('-inf')

    global g_list_result
    for r in g_list_result:
        listDt.append(r)
        # 更新最大值
        star = r['star']
        fork = r['fork']
        watch = r['watch']
        max_star = max(max_star, star)
        max_fork = max(max_fork, fork)
        max_watch = max(max_watch, watch)

    return { "maxStar": max_star, "maxFork": max_fork, "maxWatch": max_watch, "listDt": listDt }



    


def setup_log():
    # 创建日志记录器，指明日志保存的路径、每个日志文件的最大大小、保存的日志文件个数上限
    file_log_handler = RotatingFileHandler(
        "../logs/log", maxBytes=1024 * 1024 * 100, backupCount=10)
    # 创建日志记录的格式 日志等级 输入日志信息的文件名 行数 日志信息
    formatter = logging.Formatter(
        '%(levelname)s %(filename)s:%(lineno)d %(message)s')
    # 为刚创建的日志记录器设置日志记录格式
    file_log_handler.setFormatter(formatter)
    # 为全局的日志工具对象（flask app使用的）添加日志记录器
    logging.getLogger().addHandler(file_log_handler)
    
def test_hier_topic():
    docs = [
        'how to convert map keys to array?',
        'javascript displaying a float to 2 decimal places',
        'resolve javascript promise outside the promise constructor scope',
        'loading local json file',
        'dynamically load js inside js [duplicate]',
        'how to call loading function with react useeffect only once',
        'remove blank attributes from an object in javascript',
        'changing website favicon dynamically',
        'warn user before leaving web page with unsaved changes',
        'google maps api v3: how to remove all markers?',
        "how to listen for 'props' changes",
        'how to delete a cookie?',
        'download a file from nodejs server using express',
        'how to set a value to a file input in html?',
        'refresh image with a new one at the same url',
        'how to decode jwt token in javascript without using a library?',
        'how can i test if a letter in a string is uppercase or lowercase using javascript?',
        'javascript - replace all commas in a string [duplicate]',
        'detect all changes to a &lt;input type="text"&gt; (immediately) using jquery',
        'how to describe "object" arguments in jsdoc?',
        'javascript, node.js: is array.foreach asynchronous?',
        'what is the purpose of a plus symbol before a variable?',
        'new line in javascript alert box',
        'how do i find the absolute position of an element using jquery?',
        'how to tell if browser/tab is active [duplicate]',
        'how to extract the hostname portion of a url in javascript',
        'what is the "hasclass" function with plain javascript?',
        'what is the correct syntax of ng-include?',
        'what is the motivation for bringing symbols to es6?',
        'when do items in html5 local storage expire?',
        'create an empty object in javascript with {} or new object()?',
        'what are the differences between json and jsonp?',
        'difference between "process.stdout.write" and "console.log" in node.js?',
        'constructors in javascript objects',
        'how to retrieve get parameters from javascript [duplicate]',
        'what is the meaning of polyfills in html5?',
        'create an empty object in javascript with {} or new object()?',
        'what are the differences between json and jsonp?',
        'difference between "process.stdout.write" and "console.log" in node.js?',
        'constructors in javascript objects',
        'how to retrieve get parameters from javascript [duplicate]',
        'what is the meaning of polyfills in html5?',
        'how to retrieve get parameters from javascript [duplicate]',
        'what is the meaning of polyfills in html5?',
        'create an empty object in javascript with {} or new object()?',
        'what are the differences between json and jsonp?',
        'difference between "process.stdout.write" and "console.log" in node.js?',
        'constructors in javascript objects',
        'how to retrieve get parameters from javascript [duplicate]',
        ]
    

    # text_preprocessor = TextPreprocessor(True, docs=docs)

    # 处理文本并获取TF-IDF向量
    # processed_docs = [text_preprocessor.process_text(text) for text in docs]

    my_bert = MyBerTopic(docs, [i+2 for i in range(len(docs))])

    # 训练 berTopic 模型
    my_bert.train_bertopic_model()

    # 获取主题
    topics = my_bert.get_bertopic_topics()


    # 构建层次主题
    my_bert.get_hiera_topics()   
    hier_topics_json, global_total_words = my_bert.processTopicTree()   # 有三个主题，这里可以正常执行

    # 获取主题的概览信息
    topics_overview = my_bert.get_all_topics_to_all_repoIds()

     # 获取特定主题的关键词出现的文档数量和概率
    topic_keywords = my_bert.get_all_topic_words(-1, 'origin')

    # 调整主题建模的min topic size
    new_res = adjust_min_topic_size_model(15)
    
    print('hier_topics_json')
    print(hier_topics_json)
    print('global_total_words')
    print( global_total_words)
    print('topics_overview')
    print(topics_overview)
    print('topic_keywords')
    print(topic_keywords)
    print('new_res')
    print(new_res)

    # similar_topic_repoIds = my_bert.get_similar_topic_words_repo(2, 0) # 排好序的repoId的数组 [xx, xx, xx]

    # 只保留部分repoId所在的主题的节点
    # res = my_bert.get_filter_hiera_json_node([7,8,9,10, 24 ]) 
    # print(res)

def test_search_toic_model():
    # {"listData": {"maxStar": star[1], "maxFork": fork[1], "maxWatch": watch[1], "listDt": repos}, "searchTopicsDt": global_total_words, 'topicsOverview': topics_overview, 'topicModelData': hier_topics_json, "filterOption":{"timeBar": time_bar_dt, "starRange": star, "watchRange": watch, "forkRange": fork, "matchingOrderDt": matchingOrderDt, 'total_techs_tree_arr': {"max_number": max_number, "data": total_techs_tree_arr}}}
    search('how to vis', 'false')  # 执行搜索
    
    # 调整主题建模的min topic size
    # new_res = adjust_min_topic_size_model(15)

    # 获取单个项目的信息
    global g_list_result
    res = get_single_repo_info(g_list_result[0]['repoId'])

    print(g_list_result[0]['repoId'])
    for i in res['recommandRepo']['similar_topic']:
        print(i['repoId'])


def test_read_zip():
    file_number = 70324
    res, folders, files, max_depth = read_zip_directory(f'H:/A2023/originVisRepos/70000-79999/{file_number}.zip')
    wordcloud = get_wordcloud_for_repo(f'H:/A2023/originVisRepos/70000-79999/{file_number}.zip')
    folders_json = []
    for i in folders:
        clean_f = list(set(folders[i]))
        folders_json.append({"name": i.rsplit('/', 1)[0], "value": len(clean_f), "filDir": clean_f})
    
    files_json = []
    for i in files:
        clean_f = list(set(files[i]))
        files_json.append({"name": i, "value": len(clean_f), "filDir": clean_f})
        
    # print(res)
    # print(folders)
    # print(files)
    # print(max_depth)
    # print(wordcloud)
    print('词云信息')
    print({"folder": folders_json, "file": files_json, "function": wordcloud['function'], "var": wordcloud['var']})
    
if __name__ == "__main__":
    # setup_log()
    app.run(
        port=5001,   # host默认127.0.0.1 端口默认5001
        debug=True
    )

#     # 测试es连接
#     test_search()
      # 测试读取zip文件内容
    # test_read_zip()
    # 测试获取zip文件的层次结构
    # 测试层次主题建模
    # test_hier_topic() 
    
    # test_search_toic_model()

   
    
    # 本地测试搜索函数
    # 问题：
    # 2. 文档太少无法进行主题建模：避免这样的case。少文本的重心在于？？
    # print(search('how to vis', 'false'))
    # getTopicCluster('1')
    # getTopicCluster(0)
    
    # 获取单个项目的详细信息
    # res = get_single_repo_info('10196_xx')
    # print(res)
    
    # 测试变量名提取
    # test_read_zip()