"""
  对文本项目进行处理
"""
import re
from nltk.corpus import stopwords, wordnet
from nltk.stem import PorterStemmer
from nltk import word_tokenize, pos_tag
from nltk.stem import WordNetLemmatizer
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

project_dir = 'D:/Project/github/vis_repo_2024/back'
tfidf_stop_words_path = project_dir + '/data/auxiliaryData/tfidf_stop_words.txt'
abbr = project_dir + '/data/auxiliaryData/abbr.json'
abstract = project_dir + '/data/auxiliaryData/abstract.json'


def load_external_stop_word():
    try:
        with open(tfidf_stop_words_path, 'r') as file:
            lines = [line.strip("\n").strip() for line in file.readlines()]
            return lines
    except FileNotFoundError:
        print(f"File '{tfidf_stop_words_path}' not found.")
        return []


def load_abbrev_json(file_path):
    with open(file_path, 'r') as json_file:
        data = json.load(json_file)
    return data

# 获取单词的词性
def get_wordnet_pos(tag):
    if tag.startswith('J'):
        return wordnet.ADJ
    elif tag.startswith('V'):
        return wordnet.VERB
    elif tag.startswith('N'):
        return wordnet.NOUN
    elif tag.startswith('R'):
        return wordnet.ADV
    else:
        return None


class TextPreprocessor:
    def __init__(self, use_custom_stop_word=True, docs=[]):
        print('**********进行文本预处理**************')
        self.docs = docs

        self.custom_stop_words = []
        if use_custom_stop_word:
            self.custom_stop_words = load_external_stop_word()  # 读取自定义的停用词

        # self.stop_words = set(ENGLISH_STOP_WORDS.union(self.custom_stop_words))  # TfidfVectorizer的停用词，不包含标点符号
        # 获取NLTK停用词列表
        
        stop_words_nltk = set(stopwords.words('english'))
        self.stop_words = set(stop_words_nltk.union(self.custom_stop_words))  # nltk的停用词，包含标点符号

        self.stemmer = PorterStemmer()
        self.lemmatizer = WordNetLemmatizer()
        # self.nlp = spacy.load("en_core_web_sm")
        self.vectorizer = TfidfVectorizer(stop_words=self.stop_words)  # 指定停用词

        # 指定缩写替换的词
        self.abbreviation_dict = load_abbrev_json(abbr)
        self.abbreviation_dict.update(load_abbrev_json(abstract))

    def abbreviation_replace(self, text):  # 替换缩写，参考 SoftwareTagRecommender 的缩写词
        for abbreviation, full_form in self.abbreviation_dict.items():
            # 全词替换
            pattern =r'(?:^|\s)' + re.escape(abbreviation) + r'(?:^|\s|$|[,.])'
            text = re.sub(pattern, ' ' + full_form + ' ', text)
            
        # 对其中抽象后的词进行单独匹配，以满足不同的词的形态：@abstr_hyperlinkQuick ...
        abstr_text = [ "@abstr_mailto", "@abstr_hyperlink", "@abstr_code_section", "@abstr_image", "@abstr_number", "@abstr_badge"]
        for abstr in abstr_text:
            text = re.sub(abstr, '', text)
            
        return text

    def tokenize(self, text):
        words = word_tokenize(text)  # 将文本分词，考虑了空格、标点符号等因素
        return words

    def remove_stopwords(self, words):  # 移除软工领域的停用词
        filtered_words = [word for word in words if word.lower() not in self.stop_words]
        return filtered_words

    def stem_words(self, words):
        stemmed_words = [self.stemmer.stem(word) for word in words]
        return stemmed_words

    # 词形还原
    def lemmatize_words(self, words):
        tagged_sent = pos_tag(words)     # 获取单词词性

        lemmatized_words = []
        for tag in tagged_sent:
            wordnet_pos = get_wordnet_pos(tag[1]) or wordnet.NOUN
            lemmatized_words.append(self.lemmatizer.lemmatize(tag[0], pos=wordnet_pos)) # 词形还原

        # lemmatized_words = [self.lemmatizer.lemmatize(word) for word in words]
        return lemmatized_words

    def process_text(self, text):
        text = self.abbreviation_replace(text)  # 替换缩写
        words = self.tokenize(text)  # 分词
        # words = self.remove_stopwords(words)  # 移除停用词，不需要再单独移除停用词，将移除的操作放到 模型的数据处理部分

        # words = self.stem_words(words)  # 词干，更多被应用于信息检索领域，用于扩展检索，粒度较粗。

        words_lemmatized = self.lemmatize_words(words)  # 词形还原，更主要被应用于文本挖掘、自然语言处理，用于更细粒度、更为准确的文本分析和表达。
        processed_text = ' '.join(words_lemmatized)  # 组成一个完整的句子

        return processed_text  # 处理完成后干净的句子

# 测试
# docs = ['Information-visualization. project. @abstr_number .']
# t = TextPreprocessor(True)
# processed_docs = [t.process_text(text) for text in docs]
# print()