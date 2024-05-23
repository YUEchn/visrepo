// 结果列表的数据类型
export interface IQueryListDt {
  repoId: string;
  repoName: string;
  rankId: number; // 或许不需要排序的顺序？？
  score?: number; // ****这要改为必有
  size: number;
  topicId: number; // 这个指的是主题建模对应的主题id
  topics: string[]; // 这个指的是项目原本的标签
  htmlUrl?: string;
  language: object[];
  license?: ILicense;
  star: number;
  fork: number;
  watch: number;
  images: string[];
  description: string;
  techs?: ITech; // ***这个要改为必有
  highlight: {
    topics?: string[];
    repoName?: string[];
    description?: string[];
  };
  match_type?: number[];
  match_field?: string;
  hasHow?: boolean; //***这个要改为必有 */
  owner?: IOwner; //
  contentsUrl?: string; //
  contributors?: string[]; //
  createdAt?: string; //
  updatedAt?: string; //
  readme?: string; //
  usefulReadme?: string; //
}

export interface IOwner {
  description?: null | string;
  name?: string;
  type?: string;
  url?: string;
}

export interface ITech {
  tech?: string[];
  type?: string;
}

export interface ILicense {
  key?: string;
  name?: string;
  spdx_id?: string;
  url?: string;
}
// 主题层次的数据类型
export interface IThemeTreeDt {
  id: string;
  topic: string;
  type: string;
  repoIds: string[];
  words: [];
  children: [];
}

// 可设置的过滤类型
export interface IFilterOption {
  timeBar: object;
  starRange: number[];
  watchRange: number[];
  forkRange: number[];
}
// 整个查询结果的数据类型
export interface IQueryResult {
  listDt: IQueryListDt;
  treeDt: IThemeTreeDt;
  filterOption: IFilterOption;
}

export enum ListSortTypeEnum {
  BESTMATCH = "best match",
  STAR = "star",
  FORK = "fork",
  WATCH = "watch",
  UPDATETIME = "update time",
}

export interface IRepoCluster {
  id?: string;
  repoName?: string;
  score?: number;
  star?: string;
  fork?: string;
  watch?: string;
  repoTopicWords?: string[];
  language?: [];
  tech?: [];
}

export interface IRes {
  ok: boolean;
  msg?: string;
  data: { [key: string]: any };
}

// export interface ITechTree {
//   title: string;
//   key: string;
//   children?: [{ [key: string]: any }] | undefined;
// }

type techTreeNodeNoChildren = {
  title: string;
  key: string;
  children?: undefined;
};

type techTreeNodeWithChildren = {
  title: string;
  key: string;
  children: { title: string; key: string }[];
};

export type TTechTree = techTreeNodeNoChildren | techTreeNodeWithChildren;
