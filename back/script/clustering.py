# -*- coding: utf-8 -*-
import json
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.cluster import KMeans
from sklearn import metrics
from sklearn.decomposition import PCA, KernelPCA
from nltk.stem import porter
from collections import Counter
from scipy.spatial.distance import cdist  # 计算距离

corpus_path = 'E:/2-GS_py/merge keywords/all50-stem.json'


class KmeansClustering:
    def __init__(self, stopwords_path=None):
        self.stopwords = self.load_stopwords(stopwords_path)
        self.vectorizer = CountVectorizer()
        self.transformer = TfidfTransformer()
        self.cluster_dict = {}

    def load_stopwords(self, stopwords=None):
        """
        加载停用词
        :param stopwords:
        :return:
        """
        if stopwords:
            with open(stopwords, 'r', encoding='utf-8') as f:
                return [line.strip() for line in f]
        else:
            return []

    def preprocess_data(self, corpus_path):
        """
        文本预处理，每行一个文本
        :param corpus_path:
        :return:
        """
        corpus = []
        numberRes = {}
        PS = porter.PorterStemmer()  # 对关键词进行词根化
        index = 0
        for item in corpus_path:  
            temp = ""
            temp_arr = []
            # for word in item['mergeTopics']:
            for word in item['topics']:
                word_stem = PS.stem(word)
                if word_stem not in temp_arr:
                    temp += word_stem
                    temp += ' '
                temp_arr.append(word_stem)
            corpus.append(temp)

        # with open(corpus_path, 'r', encoding='utf-8') as f:
        #     data = json.load(f)
        #     for item in data:
        #         temp = ''
        #         for word in data[item]:
        #             temp += word
        #             temp += ' '
        #         corpus.append(temp)
        #         # numberRes[index] =temp
        #         # index += 1

        return corpus

    def get_text_tfidf_matrix(self, corpus):
        """
        获取tfidf矩阵
        :param corpus:
        :return:
        """
        # print(corpus, self.vectorizer.fit_transform(corpus))
        tfidf = self.transformer.fit_transform(self.vectorizer.fit_transform(corpus))

        # 获取词袋中所有词语
        # words = self.vectorizer.get_feature_names()

        # 获取tfidf矩阵中权重
        weights = tfidf.toarray()
        return weights

    def pca(self, weights, n_components=2):
        """
        PCA对数据进行降维
        :param weights:
        :param n_components:
        :return:
        """ 
        pca = PCA(n_components=n_components)   # 小数：表示保留百分之多少的信息; 整数：减少到多少特征
        # pca = KernelPCA(kernel="rbf",n_components=n_components)
        return pca.fit_transform(weights)   # weights:numpy array格式的数据[n_samples,n_features]

    def kmeans(self, corpus_path, group_index, match_group, n_clusters=15):
        """
        KMeans文本聚类
        :param corpus_path: 待聚类的数据, [{}, {}, {}, {}]
        :params group_index: 当前聚类的数据所属于的大分组，number
        :param n_clusters: ：聚类类别数目
        :param match_group:  匹配模式，[word_indx1, word_indx2, word_index4]
        :return: {cluster_id1:[{text_id1}, {text_id2}]}
        """
        corpus = self.preprocess_data(corpus_path)
        weights = self.get_text_tfidf_matrix(corpus)
        pca_weights = self.pca(weights)
        clf = KMeans(n_clusters=n_clusters)

        # clf.fit(weights)
        y = clf.fit_predict(pca_weights)
        
        # 记录坐标信息
        point_x = pca_weights[:, 0]
        point_y = pca_weights[:, 1]

        # 每个样本所属的簇, 将分类的信息添加到原始数据中
        result = {}
        for text_idx, label_idx in enumerate(y):
            temp = {}
            temp['score'] = round(corpus_path[text_idx]['score'], 2)
            temp['star'] = corpus_path[text_idx]['star']
            temp['howToDo'] = corpus_path[text_idx]['howToDo']
            temp['date'] = corpus_path[text_idx]['updatedAt'][0:7]
            temp['id'] = corpus_path[text_idx]['repoId']
            temp['mergeTopics'] = corpus_path[text_idx]['mergeTopics'].copy()
            lan = list(map(lambda x: x['name'].lower(), corpus_path[text_idx]['language'].copy()))
            temp['language'] = lan
            temp['x'] = point_x[text_idx]
            temp['y'] = point_y[text_idx]
            curId = 'c_' + str(group_index) + '_' + str(label_idx)  # 根据当前数据属于的匹配类型和所属于的簇确定id
            if curId not in result:
                result[curId] = {}
                result[curId]['topics'] = corpus_path[text_idx]['mergeTopics'].copy()
                result[curId]['language'] = lan.copy()
                result[curId]['points'] = [temp]
            else:
                result[curId]['topics'].extend(corpus_path[text_idx]['mergeTopics'].copy())
                result[curId]['language'].extend(lan.copy())
                result[curId]['points'].append(temp)
        res = []
        
        # print('res', result)
        # 转换数据格式，并统计每个簇中的top-10关键词
        for key, value in result.items():
            topic = list(map(lambda x: list(x), Counter(value['topics']).most_common(10)))
            language = list(map(lambda x: list(x), Counter(value['language']).most_common(10)))
            res.append({'id': key, "name":key, 'value': len(value), 'topics': topic, 'language': language, 'points': value['points']})
            # res.append({'id': key, 'content': match_group, "name":key, 'children': value})
        return res
