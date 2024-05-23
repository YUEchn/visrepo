"""
 基于 berTopic
  实现 主题建模

 思路参考文献：GHTRec: A Personalized Service to Recommend GitHub Trending Repositories for Developers
"""
from bertopic import BERTopic
import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer, ENGLISH_STOP_WORDS
import torch
from bertopic.representation import KeyBERTInspired
from scipy.cluster import hierarchy as sch
import numpy as np
import pandas as pd
from pandas import DataFrame
import copy
from scipy.cluster import hierarchy as sch
from sklearn.metrics.pairwise import cosine_similarity
# 以下用于计算NPMI（关联性）
from gensim.models.coherencemodel import CoherenceModel 
import gensim.corpora as corpora
from collections import defaultdict
import math

"""
关于模型的选择：
    对于每种语言的最佳模型并没有一个明确的列表，这在很大程度上取决于您的数据、模型和具体的使用情况；
    BERTopic 中的默认模型（"all-MiniLM-L6-v2"）对英语文档非常有效；
    相反，对于多语言文档或其他语言，"paraphrase-multilingual-MiniLM-L12-v2 "则表现出色；
    如果使用一种能提供更高质量但需要更多计算时间的模型，建议使用 all-mpnet-base-v2 和 paraphrase-multilingual-mpnet-base-v2。
"""

project_dir = 'D:/Project/github/vis_repo_2024/back'
# model_path = project_dir + '/model/paraphrase-multilingual-MiniLM-L12-v2'
# model_path = project_dir + '/model/all-mpnet-base-v2'
model_path = project_dir + '/models/all-MiniLM-L6-v2'
tfidf_stop_words_path = project_dir + '/data/auxiliaryData/tfidf_stop_words.txt'
custom_stop_words = ["visualise", "visualize", "vis", "visualization","visualisation","visualizer", "js", "javascript", "data", "use"]  # 自定义的停用词

class MyBerTopic:
    def __init__(self, text, index_to_repoID, query = []):
        self.bertpoic_model = None
        self.text = text   # 进行主题建模的原始文本
        self.index_to_repoID = index_to_repoID   # 每个项目的数组索引位置和项目的id之间的映射关系[r3, r5,r1,r0,xxx]
        self.hierarchical_topics = None   
        self.node_name_dict = {}   # 主题树的节点的名称映射，包含了合并节点和单个节点
        self.root_id = None   # 根节点，是string类型，所有节点的id都是string类型
        self.global_top_n_words = []   # 所有叶子节点的主题中，最重要的前几个主题                                                                                                                                                                                                                                                                                                                                    
        self.global_total_topics = []   # 所有主题（合并节点和叶子节点）的主题词，用于主图的主题过滤
        self.global_mNode_included_leaft = []   # 所有合并节点包含的上下分支节点
        self.global_mergedTopic_to_singleTopic = {}   # 所有合并主题和真实主题之间的对应关系
        self.topics_to_repoIds = {} # 在最开始会获取到 TopicId和repoId的映射关系 {int(topicId): [[repoId, repoId...], topicName]}
        self.hierarchy_json = {}   # 层次主题建模数据
        self.filtered_hierarch_json = {}   # 被过滤条件处理后的层次建模数据
        # 以下保存了，用于计算npmi
        self.topics = None 
        self.vectorizer_model = None
        
        # 用于添加查询词作为需要过滤的词
        self.query = query

    def train_bertopic_model(self, min_topic_size = 10):
        # 不让产生-1的情况，不使用会产生离群值的聚类方法，如k-Means
        # 或者指定一些值，减少离群值的产生
        # hdbscan_model = HDBSCAN(min_cluster_size=10, metric='euclidean', 
        #                 cluster_selection_method='eom', prediction_data=True, min_samples=5)
        
        # custom_stop_words = load_external_stop_word()  # 加载软件工程的停用词
        global custom_stop_words
        custom_stop_words += self.query    # 停用词加上用户的查询词
        stop_words = set(ENGLISH_STOP_WORDS.union(custom_stop_words))
        self.vectorizer_model = CountVectorizer(stop_words=stop_words, ngram_range=(1, 1))  # 加上停用词后效果更好
        # self.vectorizer_model = CountVectorizer(stop_words='english', ngram_range=(1, 3))  # 加上停用词后效果更好

        # 创建并训练 BERTopic 模型，实验室电脑上用不了这个模型
        # embedding_model = SentenceTransformer(model_path)
        # self.bertpoic_model = BERTopic(vectorizer_model=vectorizer, embedding_model=embedding_model, min_topic_size=min_topic_size, language="multilingual")
        
        embedding_model = "sentence-transformers/all-MiniLM-L6-v2"
        self.bertpoic_model = BERTopic(vectorizer_model=self.vectorizer_model, embedding_model=embedding_model, min_topic_size=min_topic_size, language="multilingual")
        self.topics, probs = self.bertpoic_model.fit_transform(self.text)
        # 减少离群值，将分为-1的异常值划分到其他主题，无用
        # new_topics = self.bertpoic_model.reduce_outliers(self.text, topics)  
        

    def get_bertopic_topics(self):
        # 获取主题
        if self.bertpoic_model:
            return self.bertpoic_model.get_topics()
        else:
            print("Model not trained yet. Please train the model first.")

    # Hierarchical topics
    def get_hiera_topics(self):
        self.get_topicIds_to_repoIds()  # 先获取到主题和项目id之间的映射关系
        # 可以使用不同的方法来生成层次主题：single、complete、average、centroid或median
        linkage_function = lambda x: sch.linkage(x, 'single', optimal_ordering=True)

        # hierarchical_topics: DataFrame 格式
        """
        在只有一个topic的时候会出错，就把它自身当成一个节点
        """
        # 只有一个主题的时候无法获取层次结构数据
        if len(self.bertpoic_model.get_topics())  != 1:
            self.hierarchical_topics = self.bertpoic_model.hierarchical_topics(self.text, linkage_function=linkage_function)   

    """
    func: 将主题层次结构处理成json格式
    :params shouldFilterMatchOrder 是否过滤不满足匹配顺序的节点
    :return json主题建模的层次json数据
                格式：{
                        "id": "136", 
                        "topic": "to_in_how_java_the", 
                        "type": "merged", 
                        "words": []
                        "children": [{
                            "id": "49", 
                            "topic": "npm_packages_install_peer_bower", 
                            "type": "origin", 
                            "children": [xxx]
                        }]
                    }
        主题为-1的节点不会被进行层次主题建模，因此需要在最终的根节点上，加上-1对应的主题文档
    """
    def processTopicTree(self):
        topic_info = self.bertpoic_model.get_topic_info()   # topic的类型为
        has_negative = False   # 表示默认没有-1的节点
        addition_node_topic_name = ''
        try:
            addition_node_topic_name = topic_info[topic_info['Topic'] == -1]['Name'].iloc[0].split('_', 1)[1]  # -1_object_javascript_new_constructors_create，去掉前面的-1
            has_negative = True 
        except Exception as e:
            print('没有主题-1', topic_info, topic_info[topic_info['Topic'] == -1]['Name'])

        # 添加-1的关键词到topicId：topicName的映射上去
        if has_negative:
            self.node_name_dict['-1'] = addition_node_topic_name
        
        if self.hierarchical_topics is None or self.hierarchical_topics.empty:   # 只有-1的节点
            self.root_id = 2 
            words, node_type = self.get_topic_n_words_ratio('-1', 2)   # 先计算主题为 -1 的节点对应的信息
            addition_node =  {'id': '-1', 'topic': addition_node_topic_name, 'type': node_type, 'repoIds': self.topics_to_repoIds[int(-1)][0],'words': words, 'children': []}

            self.global_total_topics = addition_node_topic_name.split('_')    # 所有主题的主题词
            self.hierarchy_json = {'id': '-1-root', 'topic': addition_node_topic_name, 'type': 'merged', 'repoIds': [],'words': [], 'children': [addition_node]}
            
        else:
            # Create tree，
            tree_json = {str(row[1].Parent_ID): [str(row[1].Child_Left_ID), str(row[1].Child_Right_ID)]
                    for row in self.hierarchical_topics.iterrows()}
            # 获取根节点
            self.root_id = self.hierarchical_topics['Parent_ID'][len(self.hierarchical_topics['Parent_ID']) - 1]
            
            # 用 DataFrame 的数据构建一个字典，将数字对应的名称存储起来
            self.node_name_dict.update(pd.Series(self.hierarchical_topics[['Parent_Name', 'Child_Left_Name', 'Child_Right_Name']].values.flatten(),
                                    index=self.hierarchical_topics[['Parent_ID', 'Child_Left_ID', 'Child_Right_ID']].values.flatten()).to_dict())

            self.hierarchy_json = self.build_hierarchy(tree_json, self.root_id)
            
            # 在最终的结果上面补充主题为-1的节点的信息
            if has_negative:
                words, node_type = self.get_topic_n_words_ratio('-1', int(self.root_id)/2 + 1)   # 先计算主题为 -1 的节点对应的信息
                addition_node =  {'id': '-1', 'topic': addition_node_topic_name, 'type': node_type, 'repoIds': self.topics_to_repoIds[int(-1)][0],'words': words, 'children': []}
                self.hierarchy_json['children'].append(addition_node)
                self.global_total_topics += addition_node_topic_name.split('_')    # 将主题为-1的节点的信息添加到全部的主题信息中去
               
        # 计算每个合并节点包含的keyword所在的上下分支数量
        topics_overview = []
        self.count_branch_leaf_nodes(self.hierarchy_json, topics_overview)  # 为每个合并节点添加其主题词在上下分支分布的数量
        self.global_total_topics = list(set(self.global_total_topics))  # 对主题词进行去重
        return self.hierarchy_json, self.global_total_topics  # 最终的层次结构数据以及所有主题的名称

    # 初次查询一定会执行，构造一棵完整的树
    def build_hierarchy(self, data, parent):
        words, node_type = self.get_topic_n_words_ratio(parent, int(self.root_id)/2 + 1)
        self.global_total_topics += self.node_name_dict[parent].split('_')  # 统计所有主题的主题词

        node = {'id': parent, 'topic': self.node_name_dict[parent], 'type': node_type, 'repoIds': self.topics_to_repoIds[int(parent)][0] if node_type=='origin' else [],'words': words, 'children': []}

        distance = self.hierarchical_topics.loc[(self.hierarchical_topics.Child_Left_ID == parent) | (self.hierarchical_topics.Child_Right_ID == parent), "Distance"]
        
        distance = distance.values[0] if len(distance) > 0 else 10
                                
        if parent not in data:
            return node

        left_child, right_child = data[parent]

        left_node = self.build_hierarchy(data, left_child)
        right_node = self.build_hierarchy(data, right_child)

        node['children'] = [left_node, right_node]

        return node
    
    # 定义函数用于统计每个merged节点的上下分支包含的叶子节点以及每个词的上下分支分布数量
    # param node：构建好的层次结构树
    def count_branch_leaf_nodes(self, node, topics_overview, included_repoId = []):
        # print('9999999', node)
        if node and node['type'] == 'merged':
            upper_branch_leaf_nodes = get_branch_leaf_nodes(node['children'][:1])
            lower_branch_leaf_nodes = get_branch_leaf_nodes(node['children'][1:])
            self.global_mergedTopic_to_singleTopic[node['id']] = {
                'UpperLeafNodes': upper_branch_leaf_nodes,  # 当前合并节点的上分支所包含的所有叶子节点
                'LowerLeafNodes': lower_branch_leaf_nodes,  # 当前合并节点的下分支所包含的所有叶子节点
            }
            node['word_dis'] = {}
            word_res = {}
            topic_arr =node['topic'].split('_')
            for index, word in enumerate(topic_arr):
                word_res[word] = {'upper': 0, 'lower': 0, 'index': index}   # index 用于指定顺序
                for leaf_node_id in upper_branch_leaf_nodes:
                    # 两种方式：一：获取当前主题包含的主题词，查看该词是否在它的主题词；二：遍历当前主题的文档，查看该keywords是否在这些文档里面
                    # 方式一
                    # all_words_p_for_a_topic = self.bertpoic_model.get_topic(int(leaf_node_id))
                    # all_words = list(map(lambda x: x[0].lower(), all_words_p_for_a_topic))  # 当前主题包含的所有keywords  [w1, w2, w3, ...]
                    # if word.lower() in all_words:
                    #     word_res[word]['upper'] += 1
                        
                    # 方式二：统计这些词出现的文档，这样得到的结果更加直观
                    all_repoIds = self.topics_to_repoIds[int(leaf_node_id)][0]  # 当前叶子节点包含的所有 repoId
                    for repoId in all_repoIds:
                        if len(included_repoId) == 0 or (len(included_repoId) != 0 and repoId in included_repoId):     
                            repo_index = self.index_to_repoID.index(repoId)  # 当前项目文档的索引
                            if word.lower() in self.text[repo_index].lower():
                                word_res[word]['upper'] += 1
                
                for leaf_node_id in lower_branch_leaf_nodes:
                    # 两种方式：一：获取当前主题包含的主题词，查看该词是否在它的主题词；二：遍历当前主题的文档，查看该keywords是否在这些文档里面
                    # 方式一
                    # all_words_p_for_a_topic = self.bertpoic_model.get_topic(int(leaf_node_id))
                    # all_words = list(map(lambda x: x[0].lower(), all_words_p_for_a_topic))  # 当前主题包含的所有keywords  [w1, w2, w3, ...]
                    # if word.lower() in all_words:
                    #     word_res[word]['lower'] += 1
                    
                    # 方式二：统计这些词出现的文档
                    all_repoIds = self.topics_to_repoIds[int(leaf_node_id)][0]  # 当前叶子节点包含的所有 repoId
                    for repoId in all_repoIds:
                        # 没有需要被过滤的项目id或者需要过滤项目id且当前项目id需要被保留
                        if len(included_repoId) == 0 or (len(included_repoId) != 0 and repoId in included_repoId): 
                            repo_index = self.index_to_repoID.index(repoId)  # 当前项目文档的索引
                            if word.lower() in self.text[repo_index].lower():
                                word_res[word]['lower'] += 1
                               
            node['word_dis'].update(word_res)
        if node is not None:
            for child in node['children']:
                self.count_branch_leaf_nodes(child, topics_overview, included_repoId)

    # 返回真实主题的全部概览，即每个真实主题包含的文档数，按照词的粒度进行划分
    def get_all_topics_to_all_repoIds(self):
        res = {}
        for word in self.global_total_topics:
            res[word.lower()] = 0
            for doc in self.text:
                if word.lower() in doc.lower():
                    res[word.lower()] += 1
        return [{"topicName": key, "value": value} for key, value in res.items()]

    # 获取每个主题对应的特征词
    def get_doc_topic(self, topic_id):
        return self.bertpoic_model.get_topic(topic_id)
        
    # 获取所有文档的 topic 信息
    def get_all_doc_topic(self):
        repo_info_df = self.bertpoic_model.get_document_info(self.text)
        
        # 按照文档索引构建：{doc_index: topic_id, xxx}
        doc_info_json = pd.Series(repo_info_df[['Topic']].values.flatten()).to_dict()
        return doc_info_json
        
    """
    func: 获取每个主题的前两个词的每一个词在所有主题中所占的比例以及在当前主题中所占的概率和所占的比例
    :params topic_id 当前主题的id, string 类型
    :params total_topics_length 所有的真实主题，不包含和并得到的主题
    :params n  需要返回的主题数量，默认是2
    :return 当前主题的前N个主要word的信息
        outer：当前词在所有主题中出现的概率（== 当前词所在的主题数/所有主题数）
        inner：当前词在当前主题中出现的概率（== 1/当前主题包含的词数量）（不要这个了）
        inner：内环表示当前主题下不同关键词的比率
        p: ：  当前词属于当前主题的概率
    """
    def get_topic_n_words_ratio(self, topic_id, total_topics_length, n = 3):
        res = []
        node_type='merged'
        topic_all_words = self.bertpoic_model.get_topic(int(topic_id), True)  # 参数是int形式，第二个参数表示是否返回所有，这里需要根据阈值判断
        if type(topic_all_words)!= bool:   # 不存在的节点会返回 False, -1仍会返回正常的主题词
            self.global_top_n_words += topic_all_words['Main']   # 默认时返回十个
            n = n if n < len(topic_all_words['Main']) else len(topic_all_words['Main']) # 如果传入的n比总的数据大
            top_n_words = topic_all_words['Main'][0:n]  # 这里取前三个，在前端计算它们的相对概率
            node_type = 'origin'
            for tpx in top_n_words:
                res.append({'word': tpx[0] , 'p': tpx[1]})   # 只给出当前词语的概率信息
                # word_all_topic = self.bertpoic_model.find_topics(tpx[0], int(self.root_id) / 2 + 1) # 当前词所在的所有主题 ([0,1,...],[0.4759733,0.545, ...])
                # topic_words = word_all_topic[0]  # 当前词所在的所有主题
                # topic_p = word_all_topic[1]      # 当前词所在的所有主题中的概率 [0.4759733,0.545, ...]
                # 只取概率大于某个阈值的主题，默认设置是0
                # cur_word_all_topic = list(filter(lambda x:topic_p[x[0]] > 0, enumerate(topic_words)))
                # res.append({'word': tpx[0], 'outer': round(len(cur_word_all_topic)/total_topics_length, 2), 'inner': round(1/len(topic_all_words), 2), 'p': tpx[1]})
        return res, node_type
    
    """
    获取某个特定主题的全部word词信息，包括-1的主题，查看当前主题包含的词中的一些特别的主题
    :params  topic_id string类型
    展示的信息：
     对于单个主题
        全部主题数（只有叶子节点的信息）
        每个词所在的主题数：每个主题词可能属于多个主题
        每个词在当前主题下出现的概率信息
        
     对于合并主题
        当前主题包含的主题数（只有叶子节点的信息）
        每个词所在的主题数：每个主题词可能属于多个主题
        每个词在当前主题下出现的概率信息
    : return 
        [{name: word, value: word出现的主题数}, xxx]
    """
    def get_all_topic_words(self, topic_id, topic_type, included_repoIds = []):
        all_topic_words_json = []
        if topic_type == 'origin':  # 不是合并主题；(int(self.root_id)/2)是真实主题的最大id
            range = [int(self.root_id)/2 + 2]   # 总的文档数量
            all_words_p_for_a_topic = self.bertpoic_model.get_topic(int(topic_id))  # 获取当前主题下的keywords
            word_res = {}
            for word in all_words_p_for_a_topic:
                word_res[word[0]] = {'value': 0, 'p': round(word[1], 2)}

                for repoId in self.topics_to_repoIds[int(topic_id)][0]:  # 遍历当前主题下的所有repoIds
                    if len(included_repoIds) == 0 or (len(included_repoIds) != 0 and repoId in included_repoIds):
                        if word[0].lower() in self.text[self.index_to_repoID.index(repoId)]:  # 如果当前keyword在当前主题下的某个文档内
                            word_res[word[0]]['value'] += 1
                # [all_topics_for_a_word, all_topics_p_for_a_word] = self.bertpoic_model.find_topics(word[0], int(self.root_id) / 2 + 1) 
                # measures = [len(all_topics_for_a_word), int(self.root_id)/2 + 1]
                # markers = [{"value": word[1]}]
                # all_topic_words_json.append({
                #     "title": word[0],  # word名称
                #     "range": range,    # 最大文档数量 + 1（全局/当前主题）
                #     "measures": measures,# [当前词出现的文档数，最大文档数量]
                # })
            all_topic_words_json = [{'topicName': w, 'value': info['value'], 'p': info['p']} for w, info in word_res.items()]
        # else:
        #     range = [self.global_mergedTopic_to_singleTopic[topic_id]+ 1]   # 总的文档数量
        #     words_list = {}
        #     for topic in self.global_mergedTopic_to_singleTopic[topic_id]:  # 遍历当前合并主题包含的所有子主题
        #         all_words_p_for_a_topic = self.bertpoic_model.get_topic(topic)
        #         words_arr += list(map(lambda x: x[0], all_words_p_for_a_topic))
            
        #     for word in words_arr:  # 遍历所有的词
        #         [all_topics_for_a_word, all_topics_p_for_a_word] = self.bertpoic_model.find_topics(word[0], int(self.root_id) / 2 + 1) 
        #         measures = [len(all_topics_for_a_word), int(self.root_id)/2 + 1]
        #         markers = [{"value": word[1]}]
        #         all_topic_words_json.append({
        #             "title": word[0],  # word名称
        #             "range": range,    # 最大文档数量 + 1（全局/当前主题）
        #             "measures": measures,# [当前词出现的文档数，最大文档数量]
        #             "markers":markers # 当前词出现的概率？？？
        #         })
        # 
        return all_topic_words_json

    
    """
    func: 获取特定repoId下的所有repoId
    :param topic_id，int类型，可以是和并得到的主题也可以是单独的主题
    :param topic_type，stirng类型，表明当前主题的类型
    :return 返回当前主题包含的所有项目的id
    """
    def get_topic_to_repo(self, topic_id, included_topicIds, included_repoId):
        # print(777, included_repoId)
        descendant_ids = []
        find_all_descendants(self.hierarchy_json, topic_id, descendant_ids, included_topicIds)  # 计算当前节点包含的所有子节点及其自身节点
        df = self.bertpoic_model.get_document_info(self.text)
        filtered_df = df[df['Topic'].isin(descendant_ids)]   # 使用条件过滤获取特定 Topic 的所有行
        indexes = filtered_df.index.tolist()
        repoIds = []
        for i in indexes:
            if self.index_to_repoID[i] in included_repoId:
                repoIds.append(self.index_to_repoID[i])
        return repoIds  # [rpeoId, repoId, repoId...]
        
    """
    func: 获取与某个项目主题相似的其他文档
    :param topicId，int类型，是真实主题
    :return 返回与当前项目相同的按照排序优先级的其他项目id
    """
    def get_similar_topic_words_repo(self, repoId, topicId):
        if topicId  == -1:   # 是-1的时候没有主题，执行下面的会报错
            included_repoIds = filter(lambda r: r != repoId,  self.topics_to_repoIds[-1][0])
            return list(included_repoIds)
        
        similarities = []
        same_topicId_repoIds = self.topics_to_repoIds[int(topicId)][0]  # 与当前repoId相同topicId的其他repoId
            
        # 获取给定文档的主题分布向量
        given_document_index = self.index_to_repoID.index(repoId)
        
        given_document_topic_distribution = self.bertpoic_model.approximate_distribution(self.text[given_document_index])
        
        for rId in same_topicId_repoIds:
            if rId != repoId:   # 不与自己进行相似性计算
                r_index = self.index_to_repoID.index(rId)   # 当前文档在主题建模中的文档索引
                # 获取当前文档的主题
                current_document_topic_distribution = self.bertpoic_model.approximate_distribution(self.text[r_index])
                # 计算余弦相似度
                
                similarity_score = cosine_similarity(np.array(given_document_topic_distribution[0][0]).reshape(1, -1), np.array(current_document_topic_distribution[0][0]).reshape(1, -1))[0][0]
                similarities.append((rId, similarity_score))
            
        # 根据相似性分数对文档进行排序
        similarities.sort(key=lambda x: x[1], reverse=True)
        sorted_repoIds = [r_id for r_id, _ in similarities]
        return sorted_repoIds
        
    """
    func 根据需要包含的项目id过滤部分主题
    ：return filtered_data过滤后的树图结构
    ：total_topics过滤后包含的总的主题词
    """
    def get_filter_hiera_json_node(self, included_repoId):
        # 得到需要保留的所有topicId
        topicId_to_keep = self.get_specify_topics_to_repoId(included_repoId)
        res = copy.deepcopy(self.hierarchy_json)      # 原始的层次结构树
        topicId_to_keep = list(set(topicId_to_keep))  # 需要保留的主题的主题id
        total_topics = []  # 给主题搜索框的主题词
        
        # print(77777, res)
        # print(666666, included_repoId)
        # print(55555, self.node_name_dict)

        filtered_data = filter_data(res, [str(t) for t in topicId_to_keep], included_repoId, total_topics, self.node_name_dict)
        total_topics = list(set(total_topics))  # 主题去重
        # 统计每个合并主题包含的每个主题的上下分支文档数量
        topics_overview = [] # 暂时没用的
        self.count_branch_leaf_nodes(filtered_data, topics_overview, included_repoId)
        
        return filtered_data, total_topics
    def get_filtered_topic_times(self, included_repoId, total_topics):
        res = {}
        for topic in total_topics:
            res[topic.lower()] = 0
            for idx, doc in enumerate(self.text):
                # 该文档需要被包含 && 该词语在该文档中
                if self.index_to_repoID[idx] in included_repoId and topic.lower() in doc.lower():
                    res[topic.lower()] += 1
        return [{"topicName": key, "value": value} for key, value in res.items()]

    # 给定repo的id数组，返回当前repoIds的包含的所有topicIds
    def get_specify_topics_to_repoId(self, repoIds):
        repoIndex_to_topicIds = self.get_all_doc_topic()   # {doc_index: topic_id, xxx}
        needed_topicIds = []
        for repoId in repoIds:
            needed_topicIds.append(repoIndex_to_topicIds[self.index_to_repoID.index(repoId)])
        return needed_topicIds

    # 获取所有的topicIds和repoIds之间的键值对
    def get_topicIds_to_repoIds(self):
        repo_info_df = self.bertpoic_model.get_document_info(self.text)   # {doc_index: topic_id, xxx}

        # 遍历 DataFrame 的每一行
        for index, row in repo_info_df.iterrows():
            repoId = self.index_to_repoID[index]
            topic = row['Topic']
            topicName =  row['Name'].split('_', 1)[1]
            
            # 如果 topic 不在字典中，添加一个空列表作为值
            if topic not in self.topics_to_repoIds:
                self.topics_to_repoIds[topic] = [[], topicName]   # 第一个元素是所有repoID，第二个元素是主题对应的名称
            
            # 将 document 添加到对应 topic 的列表中
            self.topics_to_repoIds[topic][0].append(repoId)

    # 计算所有合并主题包含的真实子主题
    def extract_mergeTopics_to_singleTopics(self, hiera_topic_tree):
        def dfs(node):
            if not node:
                return []
            if not node['children']:
                return [node['id']]  # 如果当前节点没有子节点，返回当前节点的id作为叶子节点
            leaf_list = []
            for child in node['children']:
                leaf_list.extend(dfs(child))  # 递归获取子节点的叶子节点
            return leaf_list

        self.global_mergedTopic_to_singleTopic[hiera_topic_tree['id']] = dfs(hiera_topic_tree)  # 添加根节点的叶子节点

        for node in hiera_topic_tree['children']:
            self.global_mergedTopic_to_singleTopic[node['id']] = dfs(node)

    """
    func 计算NMPI，计算与一个主题词最相关的其他主题词
    :params topicName 一个主题词
    :return Relevance topicName1；Relevance topicName2
    """
    def get_relevance_topic_topicNames(self, sourceTopicName):
        pass

    """
    func 衡量主题建模的效果好坏
        评估方法一：评估一个主题中，terms的一致性（Quantifying Synergy between Software Projects using README Files Only）
        评估方法二：计算NPMI
        评估方式三：计算困惑分数 Perplexity score

    """
    def evaluate_my_bertopic():
        pass


    """
    func：计算与一个特定的主题词的关联度最高的前两个词（NPMI）
    :params target 目标词汇
    :return [keyword1, keyword2] NPMI最高的前两个词
    """
    def get_top_n_npmi(self, topicName, type='npmi'):
        res = []
        
        # Preprocess documents
        documents = pd.DataFrame(
            {"Document": self.text,
            "ID": range(len(self.text)),
            "Topic": self.topics}
        )
        cleaned_docs = self.bertpoic_model._preprocess_text(documents.Document.values)
        topic_words = self.global_total_topics

        if type == 'npmi':

            # Extract vectorizer and analyzer from fit model
            analyzer = self.vectorizer_model.build_analyzer()
            
            # Extract features for topic coherence evaluation
            corpus_words = [analyzer(doc) for doc in cleaned_docs]
            dictionary = corpora.Dictionary(corpus_words)


            # 方式一：
            # coherence_cnpmi = CoherenceModel(
            #     topics=[[word for word in topic_words if word in dictionary.token2id] for topic_words in corpus_words],
            #     texts=corpus_words,
            #     dictionary=dictionary,
            #     coherence='c_npmi'
            # )
            # npmi_values = coherence_cnpmi.get_coherence_per_topic()

            # # 找出与目标词 NPMI 最大的前两个词
            # target_word_index = topic_words.index(topicName)
            # npmi_scores = defaultdict(float)

            # for i, word in enumerate(topic_words):
            #     if i != target_word_index:
            #         npmi_scores[word] = npmi_values[i]
            # sorted_words = sorted(npmi_scores, key=npmi_scores.get, reverse=True)[:2]

            # 方式二：
            npmi_values = {}
            for word in topic_words:
                if word != topicName:
                    coherence_model = CoherenceModel(
                        topics=[[topicName, word] for _ in range(len(corpus_words))],
                        texts=corpus_words,
                        dictionary=dictionary,
                        coherence='c_npmi'
                    )
                    npmi_values[word] = coherence_model.get_coherence()

            # 找出与目标词 NPMI 最大的前两个词
            sorted_words = sorted(npmi_values, key=npmi_values.get, reverse=True)[:2]


            for word in sorted_words:
                res.append(word)
        elif type == 'co':  
            # 计算共现度最高的两个词，这种响应快很多
            top_two_co_occurrences  = calculate_co_occurrence(topicName, topic_words, cleaned_docs)
            for word, count in top_two_co_occurrences:
                res.append(word)
            
        elif type == 'cus_npmi':  # 使用自定义方法实现计算 npmi
            top_two_npmi_words = calculate_npmi(topicName, topic_words, cleaned_docs)
            for word in top_two_npmi_words:
                res.append(word)

        return res


##################### 通用函数
def find_all_descendants(node, target_id, ids, included_topicIds):
    if node['id'] == target_id:
        # 如果当前节点是目标节点，则从此节点开始查找后代节点
        find_descendants(node, ids, included_topicIds)
    else:
        # 否则，继续在子节点中查找目标节点
        for child in node['children']:
            find_all_descendants(child, target_id, ids,included_topicIds)

def find_descendants(node, ids, included_topicIds):
    # 将当前节点的 ID 添加到结果列表中
    ids.append(int(node['id']))    # 节点的id是string类型，但是后面0查找对应文档的时候是int类型
    
    # 如果当前节点有子节点，则递归地处理每个子节点
    for child in node['children']:
        if(child['id'] in included_topicIds):   # 如果当前主题在主题过滤后保留的主题里面
            find_descendants(child, ids, included_topicIds)
        
# 定义函数用于获取节点的所有后代叶子节点
def get_descendant_leaf_nodes(node):
    leaf_nodes = []
    if node['type'] == 'origin':
        return [node['id']]
    for child in node['children']:
        leaf_nodes.extend(get_descendant_leaf_nodes(child))
    return leaf_nodes

# 定义函数用于获取上下分支包含的叶子节点
def get_branch_leaf_nodes(children_nodes):
    branch_leaf_nodes = []
    for child in children_nodes:
        branch_leaf_nodes.extend(get_descendant_leaf_nodes(child))
    return branch_leaf_nodes

# keep_ids：需要包含的主题id
# 删除不包含特定项目的节点以及type为merge且children为空的节点
def filter_data(data, keep_ids, included_repoId, total_topics, node_name_dict):
    if isinstance(data, dict):
        if 'id' in data and data['id'] in keep_ids:
            filtered_children = [filter_data(child, keep_ids, included_repoId, total_topics, node_name_dict) for child in data.get('children', [])]
            filtered_children = [child for child in filtered_children if child is not None]
            if filtered_children or data['id'] in keep_ids:
                intersection_repoIds = list(set(data['repoIds']) & set(included_repoId))
                curTopicId = '-1' if data['id'] == '-1-root' else data['id']
                total_topics += node_name_dict[curTopicId].split('_')  # 统计所有主题的主题词
                return {
                    'id': data['id'],
                    'type': data['type'],
                    'repoIds': data['repoIds'],  # 记录过滤前的项目id
                    # 'repoIds': intersection_repoIds,
                    'restRepoIdsLength':len(intersection_repoIds),
                    'topic': data['topic'],
                    'children': filtered_children,
                    'words': data.get('words', [])
                }
            else:
                return None
        else:
            filtered_children = [filter_data(child, keep_ids, included_repoId, total_topics, node_name_dict) for child in data.get('children', [])]
            filtered_children = [child for child in filtered_children if child is not None]
            if filtered_children:
                intersection_repoIds = list(set(data['repoIds']) & set(included_repoId))
                curTopicId = '-1' if data['id'] == '-1-root' else data['id']
                total_topics += node_name_dict[curTopicId].split('_')  # 统计所有主题的主题词
                return {
                    'id': data['id'],
                    'type': data['type'],
                    'repoIds': data['repoIds'],  # 记录过滤前的项目id
                    # 'repoIds': intersection_repoIds,
                    'restRepoIdsLength':len(intersection_repoIds),
                    'topic': data['topic'],
                    'children': filtered_children,
                    'words': data.get('words', [])
                }
            else:
                return None
    else:
        return None

# 计算共现度
def calculate_co_occurrence(target_word, words_array, corpus):
    co_occurrence_count = {word: 0 for word in words_array}

    for text in corpus:
        if target_word in text:
            for word in words_array:
                if word != target_word and word in text:
                    co_occurrence_count[word] += 1

    sorted_words = sorted(co_occurrence_count.items(), key=lambda x: x[1], reverse=True)
    top_two_co_occurrences = sorted_words[:2]

    return top_two_co_occurrences


def calculate_npmi(target_word, word_list, corpus):
    # 统计目标词在语料库中出现的文档数
    target_word_count = sum(1 for doc in corpus if target_word in doc)
    
    # 统计词列表中每个词与目标词的共现次数
    co_occurrence_counts = {}
    for word in word_list:
        if word != target_word:
            co_occurrence_count = sum(1 for doc in corpus if target_word in doc and word in doc)
            co_occurrence_counts[word] = co_occurrence_count

    # 计算 NPMI
    npmi_scores = {}
    for word, count in co_occurrence_counts.items():
        word_count = sum(1 for doc in corpus if word in doc)
        p_w1_w2 = count / len(corpus)
        p_w1 = target_word_count / len(corpus)
        p_w2 = word_count / len(corpus)
        
        # 避免除零错误
        if p_w1_w2 == 0 or p_w1 * p_w2 == 0:
            npmi_scores[word] = -float('inf')
        else:
            pmi_value = math.log(p_w1_w2 / (p_w1 * p_w2))
            npmi_value = pmi_value / -math.log(p_w1_w2)
            npmi_scores[word] = npmi_value

    # 获取 NPMI 最大的前两个词
    sorted_words = sorted(npmi_scores, key=npmi_scores.get, reverse=True)[:2]
    return sorted_words


# 加载停用词
def load_external_stop_word():
    try:
        with open(tfidf_stop_words_path, 'r') as file:
            lines = [line.strip("\n").strip() for line in file.readlines()]
            return lines
    except FileNotFoundError:
        print(f"File '{tfidf_stop_words_path}' not found.")
        return []