import { fetchData, senData } from "./request.ts";

export const getResult = async (query) => {
  return fetchData("/search/" + query);
};

export const testConnect = async (params) => {
  return fetchData("/" + params);
};

export const getSourceCode = async (filename, repo_id) => {
  return fetchData(
    "/get_source_code/" + filename.replaceAll("/", "*") + "/" + repo_id
  );
};

// 只在从推荐的仓库中选择调用这个函数
export const getRepoInfo = (repo_id) => {
  return fetchData("/get_repo_info/" + repo_id);
};

// 只在从推荐的仓库中选择调用这个函数
export const resultFilter = (archive, star, watch, fork, date_range) => {
  return fetchData(
    "/result_filter/" +
      archive +
      "/" +
      star +
      "/" +
      watch +
      "/" +
      fork +
      "/" +
      date_range
  );
};
