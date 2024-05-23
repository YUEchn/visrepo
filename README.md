### ***introduction***
This is a tool demo for our work VisRepo

#### ***directory***
```
vis_repo
|-- back
|   |-- data (for text preprocessing)
|   |-- script
|       |-- app.py (main application file)
|       |-- textProcess 
|           |-- MyBerTopic.py（topic model method）
|           |-- SourceCodeParser （parse source code method）
|           |-- TextPreProcessor（text preprocess method）
|-- vis
    |-- public(public resources)
    |-- scripts (executable commands)
    |-- src 
        |-- App.css
        |-- App.test.tsx
        |-- App.tsx
        |-- index.css
        |-- index.tsx
        |-- apis（request api）
        |   |-- api.ts
        |   |-- http.ts
        |   |-- request.ts
        |-- components (modules implementation)
        |   |-- common
        |   |-- controlPanel
        |   |-- header
        |   |-- main
        |   |-- repoCluster
        |   |-- repoPortrait
        |   |-- resultList
        |   |-- topicModelTree
        |-- styles
        |-- utils
```
### ***working with VisRepo***
***1. install and start Elasticsearch 8.4***

- download

`https://www.elastic.co/downloads/past-releases#elasticsearch`

- start

`./elasticsearch-8.4.0/bin/elasticsearch`

- check status

`http://x.x.x.x:9200`

***2. install node 16***

- download

`https://www.elastic.co/downloads/past-releases#elasticsearch`

- Configure the system environment

***3. get source code***

- clone source code

`git clone https://github.com/YUEchn/visrepo.git`

- install dependencies

In the vis_repo/vis directory, run: `npm install`

***4. start search engine***

- start backend

In the back/script directory, run: `python app.py.py`

- start frontend

In the vis_repo/vis directory, run: `npm start`

- check the status of VisRepo

`http://localhost:3000`
