import React, {Component} from "react";
import {Category, DataLoaderProps} from "./DataLoader";
import {Pie, PieChart, Tooltip} from 'recharts';
import {KMFormat} from "./util";

interface CategoryPieProps extends DataLoaderProps{
    category: Category
    hidden?: boolean
}

export default class CategoryPie extends Component<CategoryPieProps>{

    private divElement: HTMLDivElement | null = null

    componentDidMount(): void {
        this.props.dataloader.addChangeCallback(() => this.forceUpdate())
    }

    render(): React.ReactNode {
        const data = this.props.dataloader.getCategories(this.props.category)
        return (
            <div style={{height: '80vh'}} hidden={this.props.hidden || false} ref={(divElement) => this.divElement = divElement}>
            <PieChart height={this.divElement?.clientHeight} width={this.divElement?.clientWidth}>
                <Pie data={data} dataKey="value" nameKey="text" fill={this.getColor()}
                     label={({percent}) => (KMFormat((percent || 0) * 100)+'%')}
                     onClick={(e) => this.props.dataloader.addCategoryFilter(this.props.category, e.text)}/>
                <Tooltip formatter={(value) => "$"+KMFormat(value as number)}
                         contentStyle={{padding: '0 5px', margin: 0, borderRadius: 5}}/>
            </PieChart>
            </div>
        )
    }

    getColor(): string {
        switch (this.props.category) {
            case "fund":
                return "#ef5350"
            case "division":
                return "#ab47bc"
            case "department":
                return "#26c6da"
            case "gl":
                return "#26a69a"
            case "event":
                return "#d4e157"
        }
    }
}