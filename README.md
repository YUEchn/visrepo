### ***introduction***
This is a tool demo for our work VisRepo

### ***working with VisRepo***
***1. install and start Elasticsearch 8.4***

- download

`https://www.elastic.co/downloads/past-releases#elasticsearch`

- start

`./elasticsearch-8.4.0/bin/elasticsearch`

- check status

`http://x.x.x.x:9200`

***2. get source code***

- clone source code

`git clone https://github.com/YUEchn/visrepo.git`

- install dependencies

In the vis_repo/vis directory, run:

`npm install`

***4. start search engine***

- start flask

In the back/script directory, run:
`python app.py.py`

In the vis_repo/vis directory, run:
`npm start`

- check the status of codematcher

`http://x.x.x.x:3000`
