import json
import logging

from elasticsearch import helpers
from elasticsearch import Elasticsearch
import os

class SearchEngine:
    def __init__(self, index, ip='http://localhost:9200'):

        self.index = index
        self.ip = ip
        self.es = Elasticsearch(self.ip) 
        self.indices = self.es.indices

    def create_index(self):
        if self.es.indices.exists(index=self.index):
            return

        index_mpping = {
            "properties": {
                "repoId": {"type": "keyword"},
                "repoName": {"type": "text"},
                "description": {"type": "text"},
                "createdAt": {"type": "date"},
                "updatedAt": {"type": "date"},
                "size": {"type": "float"},
                "topics": {"type": "text"},
                "hasHow": {"type": "boolean"},
                "star": {"type": "float"},
                "watch": {"type": "float"},
                "fork": {"type": "float"},
                "contentsUrl": {"type": "text"},
                "htmlUrl": {"type": "text"},
                "images": {"type": "text"},
                "techs": {
                    "type": "nested",
                    "properties": {
                        "type": {"type": "text"},
                        "tech": {"type": "text"},
                    }
                },
                "readme": {"type": "text"},
                "usefulReadme": {"type": "text"},
                "language": {
                    "type": "nested",
                    "properties": {
                        "name": {"type": "text"},
                        "lines": {"type": "integer"},
                    }
                },
                "contributors": { 
                    "type": "nested",
                    "properties": {
                        "name": {"type": "keyword"},
                        "lines": {"type": "integer"},
                    }
                },
                "license": {
                    "type": "nested",
                    "properties": {
                        "key": {"type": "text"},
                        "url": {"type": "text"},
                        "name": {"type": "text"},
                        "spdx_id": {"type": "text"}
                    }
                },
                "owner": {
                    "type": "nested",
                    "properties": {
                        "name": {"type": "text"},
                        "url": {"type": "text"},
                        "type": {"type": "text"},
                        "description": {"type": "text"},
                    }
                }
            }
        }

        # ES index
        index_setting = {
            "analysis": {  
                "analyzer": {
                    "my_analyzer": { 
                        "tokenizer": "my_tokenizer"
                    }
                },
                "tokenizer": { 
                    "my_tokenizer": {
                        "type": "ngram",
                        "min_gram": 3,
                        "max_gram": 3,
                        "token_chars": [
                            "letter",
                            "digit"
                        ]
                    }
                }
            }
        }

        self.indices.create(index=self.index, mappings=index_mpping, settings=index_setting)  

    def fill_data(self):
        repo_map = load_txt()
        # clear data
        delete_by_all = {"query": {"match_all": {}}}
        self.es.delete_by_query(index=self.index, body=delete_by_all)
        print("data clearing completed")

        # fill data
        for root, dirs, files in os.walk('path to json data'):
            for file in files:
                with open(root + '/' + file, 'r', encoding='utf8') as f:
                    origin_data = json.load(f)
                    all_data = []
                    for repo_idx in origin_data:
                        temp = {"_index": self.index, "_source": {}}
                        if origin_data[repo_idx] is not None:
                            try:
                                temp['_source']['repoId'] = repo_idx + '_' + repo_map[repo_idx].split('/')[1]
                                temp['_source']['repoName'] = repo_map[repo_idx].split('/')[1]
                                temp['_source']['owner'] = {
                                    "name": origin_data[repo_idx]['owner'],
                                    "url": origin_data[repo_idx]['owner_html_url'],
                                    "type": origin_data[repo_idx]['owner_type'],
                                    "description": origin_data[repo_idx]['owner_description']
                                }
                                temp['_source']['htmlUrl'] = origin_data[repo_idx]['html_url']
                                temp['_source']['description'] = origin_data[repo_idx]['description']
                                temp['_source']['createdAt'] = origin_data[repo_idx]['created_at']
                                temp['_source']['updatedAt'] = origin_data[repo_idx]['updated_at']
                                temp['_source']['size'] = origin_data[repo_idx]['size']
                                temp['_source']['topics'] = origin_data[repo_idx]['topics']
                                temp['_source']['hasHow'] = origin_data[repo_idx]['hasHow'] 
                                temp['_source']['star'] = origin_data[repo_idx]['stargazers_count']
                                temp['_source']['watch'] = origin_data[repo_idx]['watchers_count']
                                temp['_source']['fork'] = origin_data[repo_idx]['forks_count']
                                temp['_source']['contentsUrl'] = origin_data[repo_idx]['contents_url']
                                temp['_source']['techs'] = origin_data[repo_idx]['techs'] 
                                temp['_source']['images'] = origin_data[repo_idx]['image'] 
                                temp['_source']['readme'] = origin_data[repo_idx]['readme'] 
                                temp['_source']['usefulReadme'] = origin_data[repo_idx]['usefulReadme'] 

                                if origin_data[repo_idx]['license']:  
                                    temp['_source']['license'] = {k: origin_data[repo_idx]['license'][k] for k in origin_data[repo_idx]['license'] if k != 'node_id'}
                                else:
                                    temp['_source']['license'] = {}

                                temp['_source']['language'] = list(
                                    map(lambda x: {"name": x, "lines": origin_data[repo_idx]['language'][x]},
                                        origin_data[repo_idx]['language']))
                                temp['_source']['contributors'] = list(
                                    map(lambda x: {"name": x[0], "lines": x[2]},
                                        origin_data[repo_idx]['contributors']))
                                all_data.append(temp)
                            except Exception as e:
                                print(repo_idx, origin_data[repo_idx])
                                logging.exception(e)
                helpers.bulk(self.es, all_data, )

    def delete_index(self):
        try:
            self.es.indices.delete(index=self.index)
            print(f"indez {self.index} delete success")
        except Exception as e:
            print(f"delete index fail: {str(e)}")

    def get_all_techs_in_repos(self):
        query = {
          "query": {
            "match_all": {}
          },
          "_source": ["techs"],
            "size": 10000
        }
        all_techs_in_repos = []
        res = self.es.search(index=self.index, body=query,  scroll='1m')
        scroll_id = res['_scroll_id']

        while True:

            for hit in res['hits']['hits']:
                curTech = hit['_source']['techs']['tech']
                all_techs_in_repos += curTech

            res = self.es.scroll(scroll_id=scroll_id, scroll='1m')
            if not res['hits']['hits']:
                break

        return all_techs_in_repos


def load_txt():
    repo_map = {}
    path = used_root + 'path to vis-repo-list.txt'
    lines = open(path, 'r', encoding='utf-8').readlines()
    for i in range(len(lines)):
        idx = lines[i][:-1].split('/')[0]
        usr_reponame = lines[i][:-1].split('/', 1)[1]
        repo_map[idx] = usr_reponame
    return repo_map


if __name__ == '__main__':
    se = SearchEngine('vis_repo_engine_2024')
    print('start')

    se.delete_index()

    se.create_index()
    print('indexing finished')

    se.fill_data()
    print('data storage finished')
