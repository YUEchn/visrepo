import React, { ReactNode } from "react";

const filterHeader = {
  height: "25px",
  backgroundColor: "lightblue",
  fontSize: "20px",
};

const FilterItemContainer = ({ title, children }) => {
  return (
    <div>
      <div style={filterHeader}>{title}</div>
      <div className="filter-body">{children}</div>
    </div>
  );
};
export default FilterItemContainer;
