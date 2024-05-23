# -*- coding: utf-8 -*-
import os
import re
import json
import base64

# import back.script.clustering as clustering

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from textProcess.SourceCodeParser import SourceCodeAnalyzer
import math 
import esprima
from zipfile import ZipFile

# 读取文件目录获取层次结构
def test_zip_directory():
    test_path = 'C:/Users/25507/Desktop/9.zip'
    res = {"name": 'root', "maxLOC": 0, "children": [], "dirDt": []}
    stack = ['?']
    deep_number = {}   # 每一层的最后一个元素的index
    with ZipFile(test_path) as z:
        for zip_file in z.namelist():
            try:
                new_zip_file = zip_file.encode('cp437').decode('gbk')  # 转换编码格式，让中文正确显示  0/test/res.set.js
                filename = new_zip_file.split('/', 1)[1]  # 不包含根路径   test/res.set.js
                if '.git' not in filename and len(filename) != 0 and filename[0] != '.':  # 排除一些不重要的文件
                    if filename[-1] != '/':    # 当前是文件
                        curFileDepth = filename.count('/')  # 当前文件属于第几层
                        t = res
                        content_LOC = str(z.read(zip_file), encoding='utf8').replace('\\r\\n\\r\\n', '\\r\\n').replace('\\r\\r', '\\r').count('\n') 
                        res['maxLOC'] = max(res['maxLOC'], content_LOC)
                        if curFileDepth == 0:
                            t['children'].append({'name': filename.split('/')[-1], "fileDir": filename, "value": content_LOC})
                            t['dirDt'].append(content_LOC)
                            stack = ['?']
                        else:
                            for i in range(0,curFileDepth):
                                t = t['children'][-1]
                            t['children'].append({'name': filename.split('/')[-1], "fileDir": filename, "value": content_LOC})
                            t['dirDt'].append(content_LOC)
                            while stack[-1].count('/') > curFileDepth:
                                stack.pop()
                    else:
                        curDepth = filename.count('/')   # 当前文件夹的深度
                        t = res
                        if curDepth == 0:
                            t['children'].append({'name': filename.split('/')[-2], "fileDir": filename, "children": [], "dirDt": []})
                            stack = ['?']
                            t['dirDt'].append(-1)
                        else:
                            for i in range(0,curDepth-1):
                                t = t['children'][-1]
                            t['dirDt'].append(-1)
                            t['children'].append({'name': filename.split('/')[-2], "fileDir": filename, "children": [], "dirDt": []})
                            while stack[-1].count('/') >= curDepth:
                                stack.pop()
                            stack.append(filename)

            except Exception as e:
                print(zip_file, '--------------------出错了', str(e))
    # for key , value in foler_lines:

    print(json.dumps(res))


def test_read_zip():
    test_path = 'C:/Users/CY/Desktop/0.zip'
    test_file = 'test/res.sendStatus.js'
    # 读取zip中的文件
    with ZipFile(test_path) as z:
        for zip_file in z.namelist():
            try:
                new_zip_file = zip_file.encode('cp437').decode('gbk')  # 转换编码格式，让中文正确显示  0/test/res.set.js
                filename = new_zip_file.split('/', 1)[1]  # 不包含根路径   test/res.set.js
                if filename == test_file:
                    file_content = z.read(zip_file)
                    break

            except Exception as e:
                print(file_number)
                print('--------------------出错了', str(e))


def test_search(mode="match"):
    query = 'large data visualization for graph'
    queryPattern = {
        "query": {
            "multi_match": {
                "query": query,
                "fields": [
                    "repoName",
                    "topics",
                    "description"
                ]
            }
        },
        "highlight": {
            "pre_tags": "<em>",
            "post_tags": "</em>",
            "fields": {
                "repoName": {},
                "topics": {},
                "description": {}
            }
        },
        "explain": True
    }

    es = SearchEngine()
    hits = es.execute_search(query)

    # clustering.kmeans(resp_repos)
    # clustering.fastclustring(resp_repos)
    respond = []
    exist_hash = []
    match_pattern = []
    match_pattern_obj = {}
    # # 对输入的语句进行词干化
    # query_arr = list(map(lambda x: porter_stemmer.stem(
    #     x), query.strip().lower().split(' ')))  # 将输入的文本转为数组
    # 不进行词干化
    query_arr = list(map(lambda x: x, query.strip().lower().split(' ')))  # 将输入的文本转为数组

    match_group = {}
    maxLength = 0  # 匹配模式的最大长度
    maxConnection = 0  # 关联关系最多的数目
    count = 0
    res = {}

    # 循环查询得到的每一条结果并计算每一条结果的匹配结果
    for hit in hits:
        count += 1
        content = hit['_source']
        repo_id = hit['_source']['repoName']
        score = hit['_explanation']['value']
        content['score'] = score
        content['highlight'] = hit['highlight']
        hash_val = hashlib.md5(repo_id.encode('utf-8')).digest()
        if hash_val not in exist_hash:
            exist_hash.append(hash_val)
            temp_match_pattern, match_field = calMatchPattern(hit['_explanation'], hit['highlight'], query_arr)
            if len(temp_match_pattern) == 0:
                temp_match_pattern = [-1]
            maxLength = max(maxLength, len(temp_match_pattern))  # 更新最长的匹配模式
            content['content'] = temp_match_pattern
            respond.append(content)

            # 根据匹配模式对结果进行划分
            if mode == 'match':
                match_pattern_str = '_'.join((str(i) for i in temp_match_pattern))
                if match_pattern_str not in match_group.keys():
                    match_group[match_pattern_str] = []
                match_group[match_pattern_str].append(content)

    # 对匹配结果进行聚类
    final_res = clusteringGroup(match_group, maxLength)

    # 不进行聚类，直接返回结果

    # 根据score对数据进行排序，优先级：得分降序、名称字母升序
    # respond_sorted = sorted(respond, key=lambda x: (-x['score'], x['repoName']))  # 列表的数据

    f1 = open('D:/Project/github/vis_repo/back/data/final_res.json', 'w', encoding='utf8')
    f1.write(json.dumps(final_res))
    f1.close()

    # f = open('./data/respond_sorted.json', 'w', encoding='utf8')
    # f.write(json.dumps(respond_sorted))
    # f.close()



def pca_demo():
    from sklearn.decomposition import PCA
    """
        对数据进行PCA降维
        :return: None
        """
    data = [[2, 8, 4, 5], [6, 3, 0, 8], [5, 4, 9, 1]]
    print(data)

    # 实例化PCA，保留90%信息
    transfer1 = PCA(n_components=0.9)
    data1 = transfer1.fit_transform(data)
    print("保留90%的信息，降维结果为：\n", data1)

    # 实例化PCA，指定降维数
    transfer2 = PCA(n_components=2)
    # 调用fit_transform
    data2 = transfer2.fit_transform(data)
    print("降维到2维的结果：\n", data2)

    # 坐标点信息
    print("降维到2维的坐标信息：\n", data2[:, 0], data2[:, 1])


def test_kmeans():
    kmeansObj = clustering.KmeansClustering()
    group_data = [{"topics": ['a', 'b', 'c', 'd']}, {"topics": ['aa', 'bb', 'cc']}, {"topics": ['aa', 'bb', 'dd']}, {"topics": ['cc', 'dd']}]
    group_data = [{"topics": []}, {"topics": ['c', 'dd']}]
    group_index = 0
    match_arr = [1]
    n_clusters = 2
    res = kmeansObj.kmeans(group_data, group_index, match_arr, n_clusters=n_clusters)
    print(json.dumps(res))


'''
当待聚类的点的数量少于10时，计算出这些点的相对坐标
:params  
'''
def cal_point_position():
    group_data = [{"topics": ['a', 'b', 'c', 'd']}, {"topics": ['aa', 'bb', 'cc']}, {"topics": ['aa', 'bb', 'dd']}, {"topics": ['cc', 'dd']}]
    r = 5
    n = 50
    s = -1   
    ring_index = 0
    points = []
    p = []
    start_x = 0
    start_y = 0   # 每个环上的起点坐标
    x1 = 0
    y1 = 0
    x2 = 0
    y2 = 0
    while s < n:
        if ring_index == 0:
            points.append({'x': 0, 'y': 0})    # 起点为中心点
            p.append([0,0])
            s = 1
        else:
            curr_ring = min(6*ring_index, n-s)   # 当前环上的点的个数
            for j in range(curr_ring):
                if j == 0:     # 每个环的起点
                    x = x2 = start_x = 0
                    y = y2 = start_y = ring_index*2*r
                else:
                    if j == 1:
                        angle = 1/3
                    elif (j - 1) % ring_index == 0:   # 六边形顶点
                        angle = 2/3
                    else:
                        angle = 1
                    x = (x1-x2)*math.cos(math.pi*angle) - (y1-y2)*math.sin(math.pi*angle) + x2
                    y = (y1-y2)*math.cos(math.pi*angle) + (x1-x2)*math.sin(math.pi*angle) + y2
                    x1 = x2
                    y1 = y2
                    x2 = x
                    y2 = y
                p.append([x,y])
                points.append({'x': x, 'y': y})
                if j == 6*ring_index - 1:
                    x1 = start_x
                    y1 = start_y
            s += ring_index*6
        ring_index += 1

    print(p)


def cal_repo_similarity():

    # 假设项目信息存储在列表中，每个项目是一个字典，包含名称、描述等字段
    target_project = {
        "name": "Target Project",
        "description": "This is the description of the target project.",
        # 其他项目信息类似
    }

    other_projects = [
        {
            "name": "Project 1",
            "description": "Description of project 1."
        },
        {
            "name": "Project 2",
            "description": "Description of project 2."
        },
        # 更多项目信息
    ]

    # 提取项目描述作为特征
    corpus = [target_project['description']]
    corpus.extend([project['description'] for project in other_projects])

    # 使用TF-IDF向量化文本
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(corpus)

    # 计算余弦相似度
    similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])

    # 对相似度进行排序
    sorted_indices = similarities.argsort()[0][::-1]  # 从大到小排序
    

    # 打印排序后的项目信息
    sorted_other_projects = []
    for index in sorted_indices:
        sorted_other_projects.append(other_projects[index])
        # print(other_projects[index]['name'], similarities[0][index])
    print(sorted_other_projects)


def filter_number_func(d, star, watch, fork, date_range, matching_order, filter_has_how, needed_techs, filter_license):
    # matching_order如果为空，则表示不过滤匹配顺序
    b = (filter_license == False or (filter_license == True and len(d['license'] != 0))) and (filter_has_how == False or (filter_has_how == True and d['hasHow'] == 'True')) and int(d['star'])>= star and int(d['watch'])>= watch and int(d['fork'])>= fork and (date_range[0] <= d['updatedAt'][0:7] <= date_range[1]) and (len(matching_order) == 0 or ('-').join([str(m) for m in d['match_type']]) in matching_order) and (len(needed_techs) == 0 or bool(set(needed_techs) & set(d['techs']['tech'])))

    if (filter_license == False or (filter_license == True and len(d['license'] != 0))) and (filter_has_how == False or (filter_has_how == True and d['hasHow'] == 'True')) and int(d['star']) >= star  and int(d['watch'])>= watch and int(d['fork'])>= fork and (date_range[0] <= d['updatedAt'][0:7] <= date_range[1])  :
        print(d['star'])

    return b


def extract_variables_functions_and_imports(js_file):
    with open(js_file, 'r') as file:
        js_code = file.read()

    js_code= '''import React from "react"
                //import useControl from "react-map-gl/dist/esm/components/use-control"
                import {useControl} from "react-map-gl";
                import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.min"
                import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css"
                import {toast} from "../../layouts/app/app";

                export default function GeocoderControl(props) {
                    useControl(
                        ()=>{
                            const ctrl = new MapboxGeocoder({
                                ...props,
                                marker: false,
                                accessToken: props.mapboxAccessToken
                            })
                            ctrl.on("loading", props.onLoading)
                            ctrl.on("results", props.onResults)
                            ctrl.on("result", evt => {
                                    props.onResult(evt)
                                const {result} = evt
                                const location = result && (result.center || (result.geometry?.type === "Point" && result.geometry.coordinates))
                                if (location && props.marker){
                                    props.addMarker(location[0],location[1],false)
                                    props.viewState({
                                        latitude : location[1],
                                        longitude: location[0],
                                        zoom: 5.5
                                    })
                                }else {
                                    toast({
                                        title: 'An error occurred.',
                                        description: "Couldn't add marker to specified location",
                                        status: 'error',
                                        duration: 5000,
                                        isClosable: true,
                                    })
                                }
                            })
                            ctrl.on("error", props.onError)
                            return ctrl
                        }
                        ,{
                            position: props.position
                        }
                    )
                }

                const noop = () => {}

                GeocoderControl.defaultProps = {
                    marker: true,
                    onLoading: noop,
                    onResults: noop,
                    onResult: noop,
                    onError: noop
                }'''
    # ast = esprima.parseScript(js_code)
    # ast = esprima.parseScript(js_code, {'sourceType': 'module'})
    # ast = pyesprima.parseScript(js_code)

    # variables = []
    # functions = []
    # imports = []

    # # 遍历AST树
    # for node in ast['body']:
    #     if node['type'] == 'VariableDeclaration':
    #         for declaration in node['declarations']:
    #             variables.append(declaration['id']['name'])
    #     elif node['type'] == 'FunctionDeclaration':
    #         functions.append(node['id']['name'])
    #     elif node['type'] == 'ImportDeclaration':
    #         imports.extend([specifier['local']['name'] for specifier in node['specifiers']])

    # return variables, functions, imports

     # 匹配变量名
    variables = re.findall(r'\bvar\s+([a-zA-Z_$][a-zA-Z\d_$]*)\s*=', js_code)

    # 匹配函数名
    functions = re.findall(r'\bfunction\s+([a-zA-Z_$][a-zA-Z\d_$]*)\s*\(', js_code)

    return variables, functions



def js_ast():
    content = f''
    ast = esprima.parse(content)

if __name__ == "__main__":
    # setup_log()
    # app.run(
    #     port=5001,   # host默认127.0.0.1 端口默认5001
    #     debug=True
    # )

#     # 测试es连接
#     test_search()
      # 测试读取zip文件内容
    # test_read_zip()
    # 测试获取zip文件的层次结构

    # test_zip_directory()

    # 测试pca
    # pca_demo()

    # 测试聚类
    # test_kmeans()

    # 测试坐标生成
    # cal_point_position()

    # 测试相似性
    # cal_repo_similarity()

    # g = list(filter(lambda d: filter_number_func(d, 100 ,0, 0, ['2010-01', '2024-01'], [] ,False, [], False), data))
    # print(len(g))

    
    js_file = 'C:/Users/CY/Desktop/geocoder.js'  # JavaScript文件路径
    variables, functions = extract_variables_functions_and_imports(js_file)

    # print(js_ast())
    pass