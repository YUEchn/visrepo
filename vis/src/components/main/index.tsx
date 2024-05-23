import React, { useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { getResult, getSingleRepoInfo } from "../../apis/api.ts";
import style from "./index.module.less";
import { IQueryResult, IRes, ListSortTypeEnum } from "../../utils/type.ts";
import Header from "../header/index.tsx";
import ResultList from "../resultList/index.tsx";
import ControlPanel from "../controlPanel/index.tsx";
import TopicModelTree from "../topicModelTree/index.tsx";
import RepoPortrait from "../repoPortrait/index.tsx";

var firstListDtLength = 0; // 第一次查询得到的数据长度，用来后续判断是否在过滤后的数据中进行处理

const Main = () => {
  const [uiLeftDirection, setUiLeftDirection] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [query, setQuery] = useState<string>("");
  const [shouldQueryInResult, setShouldQueryInResult] =
    useState<boolean>(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [listResultDt, setListResultDt] = useState({});
  const [topicModelTreeDt, setTopicModelTreeDt] = useState({});
  const [filterOptionDt, setFilterOptionDt] = useState({
    // 用于去过滤的数据
    timeBar: {},
    starRange: [0, 0],
    watchRange: [0, 0],
    forkRange: [0, 0],
    matchingOrderDt: [],
    total_techs_tree_arr: { data: [], max_number: 0 },
  });
  const [loading, setLoading] = useState<boolean>(false);

  // 单个项目的详细信息的部分
  const [basicInfo, setBasicInfo] = useState({});
  const [directory, setDirectory] = useState({});
  const [variablesWordCloud, setVariablesWordCloud] = useState([]);
  const [recommandRepo, setRecommandRepo] = useState({
    related_owner: [],
    related_contirbutor: [],
    similar_topic: [],
  });
  const [searchTopicsDt, setSearchTopicsDt] = useState([]);
  const [topicsOverview, setTopicsOverview] = useState([]);
  

  // 主题建模选择的id
  const [selectedTopicId, setSelectedTopicId] = useState(""); // 选中的主题

  // 控制界面向左偏移
  useEffect(() => {
    const leftContent = document.getElementById("search-result-id");
    if (leftContent) {
      if (uiLeftDirection) {
        leftContent.style.transform = "translateX(0)"; // 向左偏移的量取决于右侧的宽度
      } else {
        leftContent.style.transform = "translateX(-50vw)"; // 向左偏移的量取决于右侧的宽度
      }
    }
  }, [uiLeftDirection]);

  useEffect(() => {
    if (query) {
      try {
        setLoading(true); // 让列表处于加载状态
        getResult(query, shouldQueryInResult).then((res: IRes) => {
          if (res.ok) {
            console.log("列表数据和主图数据", res.data);
            setListResultDt(res.data.listData);
            setTopicModelTreeDt(res.data.topicModelData);
            setFilterOptionDt(res.data.filterOption);
            setSearchTopicsDt(res.data.searchTopicsDt);
            setTopicsOverview(res.data.topicsOverview);
            firstListDtLength = res.data.listData.length;
          } else {
            setErrorMsg(res.msg);
          }
          setLoading(false);
        });
      } catch (e) {
        console.log("数据查询出错：", e);
      }
    }
  }, [query]);

  useEffect(() => {
    if (selectedRepoId) {
      // 获取指定仓库的数据
      try {
        getSingleRepoInfo(selectedRepoId).then((res: IRes) => {
          if (res.ok) {
            console.log("单个项目的数据", res.data);
            setBasicInfo(res.data.basicInfo);
            setDirectory(res.data.directory);
            setVariablesWordCloud(res.data.variablesWordCloud);
            setRecommandRepo(res.data.recommandRepo);
          } else {
            setErrorMsg(res.msg);
          }
          setLoading(false);
        });
      } catch (e) {
        console.log("数据查询出错：", e);
      }
    }
  }, [selectedRepoId]);

  function ErrorFallback({ error }) {
    return (
      <div role="alert">
        <p>Something went wrong:</p>
        <pre style={{ color: "blue" }}>{error.message}</pre>
      </div>
    );
  }

  if (errorMsg) {
    return <ErrorFallback error={errorMsg} />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className={style["main-container"]}>
        <div className={style["header"]}>
          <Header
            shouldQueryInResult={shouldQueryInResult}
            setShouldQueryInResult={setShouldQueryInResult}
            setQuery={setQuery}
            setUiLeftDirection={setUiLeftDirection}
            uiLeftDirection={uiLeftDirection}
          />
        </div>
        <div id="search-result-id" className={style["search-result"]}>
          <div id="center-chart" className={style["center-chart-container"]}>
            <div className={style["search-filter"]}>
              <ControlPanel
                filterOptionDt={filterOptionDt}
                setListResultDt={setListResultDt}
                setTopicModelTreeDt={setTopicModelTreeDt}
                setSearchTopicsDt={setSearchTopicsDt}
                setTopicsOverview={setTopicsOverview}
              />
            </div>
            <div className={style["topic-tree-container"]}>
              <TopicModelTree
                data={topicModelTreeDt}
                setSelectedRepoId={setSelectedRepoId}
                setSearchTopicsDt={setSearchTopicsDt}
                searchTopicsDt={searchTopicsDt}
                topicsOverview={topicsOverview}
                setTopicModelTreeDt={setTopicModelTreeDt}
                setListResultDt={setListResultDt}
                setUiLeftDirection={setUiLeftDirection}
                setSelectedTopicId={setSelectedTopicId}
                selectedTopicId={selectedTopicId}
              />
            </div>
          </div>
          <div className={style["list-container"]}>
            <ResultList
              data={listResultDt}
              query={query}
              loading={loading}
              setSelectedRepoId={setSelectedRepoId}
              setUiLeftDirection={setUiLeftDirection}
              setSelectedTopicId={setSelectedTopicId}
              setListResultDt={setListResultDt}
            ></ResultList>
          </div>
          <div className={style["repo-portrait"]}>
            <RepoPortrait
              query={query}
              basicInfo={basicInfo}
              directory={directory}
              variablesWordCloud={variablesWordCloud}
              recommandRepo={recommandRepo}
              setSelectedRepoId={setSelectedRepoId}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Main;
