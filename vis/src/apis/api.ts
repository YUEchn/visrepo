import { get, post } from "./http.ts";

export const getResult = (query, within_result = false) => {
  return post("/search/" + query + "/" + within_result);
};

export const testConnect = (params) => {
  return get("/" + params);
};

// 获取特定主题下的项目数据
export const getTopicCluster = (topic_id, included_topicIds, topic_type) => {
  return post("/topic_cluster",  {"topic_id": topic_id, "included_topicIds": included_topicIds, 'topic_type': topic_type} );
};

export const getSourceCode = (filename, repo_id) => {
  return get(
    "/get_source_code/" + filename.replaceAll("/", "*") + "/" + repo_id
  );
};

// 只在从推荐的仓库中选择调用这个函数
export const getRepoInfo = (repo_id) => {
  return get("/get_repo_info/" + repo_id);
};

// 根据用户设置的条件进行过滤
export const resultFilter = (rest) => {
  return post("/result_filter", rest);
};

// 获取单个项目的详细信息
export const getSingleRepoInfo = (repo_id) => {
  return get("/get_single_repo_info/" + repo_id);
};

// 调整主题建模的最小主题的size
export const adjustMinTopicSizeModel = (min_topic_size) => {
  return get("/adjust_min_topic_size_model/" + min_topic_size);
};

// 获取主题对应的共现主题
export const getCooccurenceTopic = (topicName) => {
  return get("/get_cooccurence_topic/" + topicName)
}

// 获取列表的全部数据
export const getAllListData = () => {
  return get("/get_all_list_data")
}