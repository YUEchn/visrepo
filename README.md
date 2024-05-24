### introduction
This is a tool demo for our work VisRepo

#### project directory
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
### develop environment preparation
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

***4. download data and build Eslaticsearch index***

data(Google Drive): https://drive.google.com/drive/folders/1zV7Q9pWhLJ5Wl8de2Hc4vfwROZFSM7Z2?usp=drive_link

build Eslaticsearch index: `python indexing.py`

### start search engine

- start backend(back/script), run: `python app.py.py`

- start frontend(vis_repo/vis), run: `npm start`

- check the status of VisRepo

`http://x.x.x.x:3000`
