/* eslint-disable jsx-a11y/anchor-is-valid */
import React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  BarChartOutlined,
  EyeTwoTone,
  StarTwoTone,
  ForkOutlined,
} from "@ant-design/icons";
import {
  Typography,
  List,
  Space,
  Cascader,
  Tag,
  ConfigProvider,
  Badge,
  Radio,
} from "antd";
import parse from "html-react-parser";
import * as d3 from "d3";
import { IQueryListDt, ListSortTypeEnum } from "../../utils/type.ts";
import ScrollImage from "../common/scrollImage.tsx";
import MiniBar from "./miniBar.tsx";
import "./index.less";

import { resultListDt } from "../../utils/testData.ts"; // 测试数据
import { getAllListData } from "../../apis/api.ts";

const { Paragraph } = Typography;
const wordColor = {
  0: "#0958d9",
  1: "#531dab",
  2: "#08979c",
  3: "#389e0d",
  4: "#c41d7f",
  5: "#cf1322",
  6: "#d46b08",
  7: "#d4b106",
  8: "#d4380d",
  9: "#1d39c4",
  10: "#7cb305",
  11: "#7cb305",
  12: "#7cb305",
};

const listRankIdColor = {
  1: "#f5222d",
  2: "#faad14",
  3: "#52c41a",
  0: "#aaa",
};

interface IResultList {
  data: {
    maxStar: number;
    maxFork: number;
    maxWatch: number;
    listDt: IQueryListDt[];
  };
  loading: boolean;
  query: string;
  setSelectedRepoId: (repoId: string) => void;
  setUiLeftDirection: (p) => void;
  setSelectedTopicId: (p) => void;
  setListResultDt: (p) => void;
}
const ResultList = (props: IResultList) => {
  let { data, loading, query, setSelectedRepoId, setUiLeftDirection, setSelectedTopicId, setListResultDt } = {
    ...props,
  };
  // data = resultListDt;

  const [rows, setRows] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandable, setExpandable] = useState(true);
  const [listKey, setListKey] = useState({});
  const [listFold, setListFold] = useState({});
  const [rankType, setRankType] = useState("score");

  const options = [
    {
      value: "score",
      label: "Best match",
    },
    {
      value: "star",
      label: "Star",
    },
    {
      value: "fork",
      label: "Fork",
    },
    {
      value: "watch",
      label: "Watch",
    },
    {
      value: "updatedAt",
      label: "UpdatedAt",
    },
    {
      value: "topicId",
      label: "Topic",
    },
  ];

  useEffect(() => {
    if (data.listDt && data.listDt.length !== 0) {
      // 对数据进行排序
      data.listDt.sort((a, b) => parseInt(b[rankType]) - parseInt(a[rankType]));
      for (let i = 0; i < data.listDt.length; i++) {
        let key = data.listDt[i].repoId;
        let tempKey = { [key]: data.listDt[i].repoId + "$" + i };
        let tempFold = { [key]: true };
        setListKey((p) => ({ ...p, ...tempKey }));
        setListFold((p) => ({ ...p, ...tempFold })); // 初始化数据，所有描述都被折叠
      }
    }
  }, [data, rankType]);

  const onExpand = (e) => {
    let curRepo = e.target.parentNode.id.split("$")[0];
    let tempFold = { [curRepo]: false };
    setListFold((p) => ({ ...p, ...tempFold }));
  };

  const onCollapse = (e) => {
    let curRepo = e.target.parentNode.parentNode.id.split("$")[0];
    let tempFold = { [curRepo]: true };
    let tempKeyNumber =
      parseInt(e.target.parentNode.parentNode.id.split("$")[1]) + 1;
    let tempKey = { [curRepo]: [curRepo] + "$" + tempKeyNumber };
    setListFold((p) => ({ ...p, ...tempFold }));
    setListKey((p) => ({ ...p, ...tempKey }));
  };

  const onDescriptionCollapse = useCallback(
    (e) => {
      let curRepo = e.target.id.split("$")[0];
      let isCurRepoFolded = listFold[curRepo];
      if (!isCurRepoFolded) {
        // 当前段落被展开，则将它折叠
        let tempFold = { [curRepo]: true };
        let tempKeyNumber = parseInt(e.target.id.split("$")[1]) + 1;
        let tempKey = { [curRepo]: [curRepo] + "$" + tempKeyNumber };
        setListFold((p) => ({ ...p, ...tempFold }));
        setListKey((p) => ({ ...p, ...tempKey }));
      }
    },
    [listFold, listKey]
  ); // 这样依赖好像有问题，但是 emmmm

  // 高亮相同的tag
  const highlightTag = (e) => {
    let currTopic = e.target.innerText.replace(/-|_/g, " ");
    let elements = document.querySelectorAll(
      `${".repo-list-content span[value='" + currTopic + "']"}`
    );
    for (let i of elements) {
      i.classList.add("tagSelected");
    }
  };

  const highlightRemove = () => {
    let elements = document.querySelectorAll(
      ".repo-list-content span[type=topicSpan]"
    );
    for (let i of elements) {
      i.classList.remove("tagSelected");
    }
  };

  const IconText = ({ icon, text }) => (
    <Space>
      {icon}
      {text}
    </Space>
  );

  const MiniCircle = ({ content }) => {
    const miniCircleOver = (event, d) => {
      let tooltip = d3.select("#list-tooltip");
      tooltip
        .style("left", event.pageX + 18 + "px")
        .style("top", event.pageY - 100 + "px")
        .style("display", "block")
        .html(`<strong>word: </strong>${d}`);
    };
    const miniCircleOut = (event, d) => {
      d3.select("#list-tooltip").style("display", "none"); // Hide toolTip
    };
    return (
      <>
        {" "}
        {content ? (
          content.map((e) => {
            return (
              <svg viewBox="0 0 1024 1024" width="10" height="10">
                <path
                  d="M512 512m-512 0a23 23 0 1 0 1024 0 23 23 0 1 0-1024 0Z"
                  fill={wordColor[e]}
                  onMouseOver={(event) => {   // 鼠标的交互
                    miniCircleOver(event, e);
                  }}
                  onMouseOut={miniCircleOut}
                ></path>
                <text x="240" y="800" font-size="1024" fill="white">{e}</text>
              </svg>
            );
          })
        ) : (
          <></>
        )}
      </>
    );
  };

  function onListScopeChange(e){
    if(e.target.value === 'all'){
      getAllListData().then((res: IRes) => {
        if(res.ok){
          setListResultDt(res.data)
        } else {
          console.log(res.msg);
        }
      })
    }
  }

// 加载磁盘文件
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
  }
};

  return (
    <>
      <div className="repo-list-title">
        <p>&nbsp;{data?.listDt?.length}&nbsp;Repositories</p>
        <div className="result-list-sort">
          <Radio.Group onChange={onListScopeChange} defaultValue={'partial'} style={{width: '150px'}}>
            <Radio value={'all'} style={{color: "#6a6969"}}>All</Radio>
            <Radio value={'partial'} style={{color: "#6a6969"}}>Partial</Radio>
          </Radio.Group>
          <div className="sort-title">Sort by&nbsp;</div>
          <Cascader
            size="small"
            options={options}
            onChange={(value: string[]) => setRankType(value[0])}
            defaultValue={["score"]}
          />
          &nbsp;&nbsp;&nbsp;
          <span className="list-rank-title">Rank/Topic</span>
        </div>
      </div>
      <div className="repo-list-content">
        {data?.listDt?.length !== 0 && (
          <ConfigProvider
            theme={{
              components: {
                List: {
                  titleMarginBottom: 0,
                  avatarMarginRight: 7,
                  itemPaddingSM: 7,
                  metaMarginBottom: 0,
                },
              },
              token: {
                fontFamily: "Calibri, Arial, Sans",
                lineHeight: 1.465,
              },
            }}
          >
            <List
              itemLayout="vertical"
              size="small"
              loading={loading}
              dataSource={data.listDt}
              pagination={{
                pageSize: pageSize,
                size: "small",
                onChange: (curPage, curSize) => setPageSize(curSize),
              }}
              renderItem={(item) => (
                // @ts-ignore
                <List.Item
                  key={item.repoId}
                  actions={[
                    <MiniBar
                      repoId={item.repoId}
                      type="star"
                      icon={<StarTwoTone twoToneColor="#aaa" />}
                      value={item.star}
                      maxValue={data.maxStar}
                    />,
                    <MiniBar
                      repoId={item.repoId}
                      type="fork"
                      icon={<ForkOutlined twoToneColor="#557ebd" />}
                      value={item.fork}
                      maxValue={data.maxFork}
                    />,
                    <MiniBar
                      repoId={item.repoId}
                      type="watch"
                      icon={<EyeTwoTone twoToneColor="#aaa" />}
                      value={item.watch}
                      maxValue={data.maxWatch}
                    />,
                    <IconText
                      icon={<BarChartOutlined />}
                      text={item.size}
                      // @ts-ignore
                      key="list-vertical-like-o"
                    />,
                    <MiniCircle content={item.match_type} />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <ScrollImage
                        width={100}
                        height={100}
                        images={item.images}
                      />
                    }
                    title={
                      <div className="list-row-title">
                        <a
                          className="list-repo-name"
                          onClick={() => {
                            setSelectedRepoId(item.repoId);
                            setUiLeftDirection(false);
                          }}
                        >
                          {item.highlight.hasOwnProperty("repoName")
                            ? // @ts-ignore
                              parse(item.highlight.repoName[0])
                            : item.repoName}
                        </a>
                        <div>
                          <Badge
                            size="small"
                            count={item.rankId + 1}
                            showZero
                            color={
                              Object.keys(listRankIdColor).includes(
                                (item.rankId + 1).toString()
                              )
                                ? listRankIdColor[item.rankId + 1]
                                : listRankIdColor[0]
                            }
                          />
                          <Badge
                            size="small"
                            className="rank-index"
                            count={item.topicId}
                            showZero
                            color={listRankIdColor[0]}
                            onClick={(e) => setSelectedTopicId(e.target.innerHTML)}
                          />
                        </div>
                        {/* <Badge size = "small" count={item.rankId} showZero color={Object.keys(listRankIdColor).includes(item.rankId.toString())? listRankIdColor[item.rankId] : listRankIdColor[0]} /> */}
                      </div>
                    }
                    description={
                      <Paragraph
                        key={listKey[item.repoId]}
                        id={listKey[item.repoId]}
                        ellipsis={{
                          rows: 4,
                          symbol: "v",
                          expandable,
                          onExpand: onExpand,
                        }}
                        onClick={onDescriptionCollapse}
                      >
                        {item.highlight.hasOwnProperty("description")
                          ? (() => {
                              let description = item.highlight.description
                                ?.join(" ")
                                .split(/<em>|<\/em>/);
                              let desc_str = "",
                                query_arr = query.toLowerCase().split(/ +|-/); // 根据空格和-分隔
                              // @ts-ignore
                              for (let s of description) {
                                if (s !== "") {
                                  let s_index = query_arr.indexOf(
                                    s.toLowerCase().trim()
                                  );
                                  if (s_index !== -1) {
                                    desc_str += `<b className='css-var-input-span match-style${s_index}'>${s}</b>`;
                                  } else {
                                    desc_str += s;
                                  }
                                }
                              }
                              return parse(desc_str);
                            })()
                          : item.description}
                        {!listFold[item.repoId] && (
                          <span className="value-collapse" onClick={onCollapse}>
                            <a> ^</a>
                          </span>
                        )}
                      </Paragraph>
                    }
                    // onClick={() => {
                    //   setSelectedRepoId(item.repoId);
                    // }} // 设置当前选中的仓库id
                  />
                  {!item.highlight.hasOwnProperty("topics")
                    ? item.topics.map((topic) => {
                        return (
                          // @ts-ignore
                          <Tag
                            type="topicSpan"
                            value={topic.replace(/\-|\_/g, " ").toLowerCase()}
                            onMouseOver={highlightTag}
                            onMouseOut={highlightRemove}
                          >
                            {topic}
                          </Tag>
                        );
                      })
                    : (() => {
                        let htemp: string[] = [];
                        let query_arr = query.toLowerCase().split(/ +|-/);
                        let temp = item.highlight.topics?.map((t) => {
                          let tt = t
                            .replace(/<em>/g, "")
                            .replace(/<\/em>/g, "")
                            .toLowerCase(); // 在highlight中的topic
                          let ttt = "";
                          t.split(/<em>|<\/em>/).forEach((e) => {
                            if (
                              e !== "" &&
                              query_arr.indexOf(e.toLowerCase().trim()) !== -1
                            ) {
                              ttt += `<b className='css-var-input-span match-style${query_arr.indexOf(
                                e.toLowerCase().trim()
                              )}'>${e}</b>`;
                            } else {
                              ttt += e;
                            }
                          });
                          htemp.push(ttt);
                          return tt;
                        });
                        let tags = item.topics.map((topic) => {
                          let s_index = temp?.indexOf(topic.toLowerCase()) || 0;
                          if (s_index !== -1) {
                            return (
                              // @ts-ignore
                              <Tag
                                type="topicSpan"
                                value={topic.replace(/-|_/g, " ").toLowerCase()}
                                onMouseOver={highlightTag}
                                onMouseOut={highlightRemove}
                              >
                                {parse(htemp[s_index])}
                              </Tag>
                            );
                          } else {
                            return (
                              // @ts-ignore
                              <Tag
                                type="topicSpan"
                                value={topic
                                  .replace(/\-|\_/g, " ")
                                  .toLowerCase()}
                                onMouseOver={highlightTag}
                                onMouseOut={highlightRemove}
                              >
                                {topic}
                              </Tag>
                            );
                          }
                        });
                        return tags;
                      })()}
                </List.Item>
              )}
            />
          </ConfigProvider>
        )}
      </div>
      <div id="list-tooltip" className="toolTip"></div>
    </>
  );
};

export default React.memo(ResultList);
