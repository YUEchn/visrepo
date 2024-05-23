import React, { useState, useEffect, useCallback }  from "react";

interface IMiniBar{
    type: string;
    value: number;
    repoId: number;
    icon: any;
    maxValue: number;
}
const MiniBar = (props: IMiniBar) => {
    const { type, repoId, icon, value, maxValue} = {...props}
    
    useEffect(() => {
        const widthRatio = value/maxValue;
        let targetDiv = document.getElementById(`minibar-chart-${type}-${repoId}`)
        if(targetDiv){
            targetDiv.style.width = `${widthRatio*100}%`;
        }

    }, [])
    

    return (
    <div className="minibar-chart-container">
        <span className="minibar-chart-notion">{icon}</span>
        <div className="minibar-chart">
            <div className="minibar-chart-bg"></div>
            <div id={`minibar-chart-${type}-${repoId}`} className="minibar-chart-target"></div>
        </div>
        <span className="minibar-chart-notion">{value}</span>
    </div>
    )
}

export default React.memo(MiniBar)