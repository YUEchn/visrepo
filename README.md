### introduction
VisRepo is a visualization-based open-source project retrieval tool, this is a tool demo for it.

[Demo Tool Website](http://122.51.117.54)

[Demo Video](https://youtu.be/-fqL8ngSmwQ)

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

#### repo source code

<details>
<summary>add these folders into a folder and change the folder path in back/app.py</summary>

[60000-69999](https://pan.quark.cn/s/908cb145f453)
[20000-29999](https://pan.quark.cn/s/cd8b689d9bee)
[70000-79999](https://pan.quark.cn/s/4b5f5303ebc3)
[50000-59999](https://pan.quark.cn/s/3f77cf88805b)
[40000-49999](https://pan.quark.cn/s/73865f07cae6)
[30000-39999](https://pan.quark.cn/s/a91859f45c95)
[10000-19999](https://pan.quark.cn/s/a1709a6b2789)
[0-9999](https://pan.quark.cn/s/bfe8279394bd)

</details>

***2. install node 16***

- download

`https://nodejs.org/download/docs/v0.12.7/`

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
