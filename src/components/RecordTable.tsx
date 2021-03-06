/**
 * Created by TylerLiu on 2018/12/23.
 */
import React, {Component} from 'react';
import {
    Grid,
    VirtualTable,
    TableHeaderRow,
    TableSummaryRow,
    ExportPanel,
    TableColumnVisibility, Toolbar, TableGroupRow, GroupingPanel, SearchPanel, TableColumnResizing
} from "@devexpress/dx-react-grid-material-ui";
import {Category, DataLoaderProps, isOfTypeCategory} from "../models/DataLoader";
import {
    Column, GroupingState, GroupSummaryItem, IntegratedFiltering, IntegratedGrouping,
    IntegratedSorting,
    IntegratedSummary, SearchState,
    Sorting,
    SortingState, SummaryItem,
    SummaryState, TableColumnWidthInfo, TableGroupRow as TableGroupRowBase
} from "@devexpress/dx-react-grid";
import {Paper} from "@material-ui/core";
import {DataTypeProvider} from "@devexpress/dx-react-grid";
import {GridExporter} from "@devexpress/dx-react-grid-export";
import {saveAs} from "file-saver";
import Datasets from "../models/Datasets";
import {Workbook} from "exceljs";
import {isOfTypeTabs, TabTypes} from "./DatasetView";

const month_name = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

const CurrencyFormatter = ({value}: {value: number}) => (
    <span style={{ color: 'blue'}}>
        {value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
    </span>
);

const DateFormatter = ({ value }: {value: Date}) => (
    <span>{value.toDateString()}</span>
);

const DateGroupFormatter = ({ column, row }: TableGroupRowBase.ContentProps) => {
    if (column.name === 'date') {
        row.key.toString()
        const [year, month] = row.key.toString().split('-');
        return <span><strong>Date:</strong> {month_name[Number.parseInt(month) - 1]} {year}</span>
    } else return (
        <span><strong>{column.title}:</strong> {row.value}</span>
    )
};

const dateToYearMonth = (value: Date) =>
    value.getFullYear().toString().padStart(4, '0') + '-' + (value.getMonth() + 1).toString().padStart(2, '0')

interface RecordTableState {
    sortingState: Sorting[]
    groupBy: Category | "date" | undefined
}

interface RecordTableProps extends DataLoaderProps{
    hidden?: boolean | undefined;
    onChange: (a: TabTypes) => void;
}

export default class RecordTable extends Component<RecordTableProps, RecordTableState> {

    private TableHeaderCell = (props: TableHeaderRow.CellProps) => (
        <TableHeaderRow.Cell
            {...props}
            onClick={() => this.setSorting(props.column)}
            style={this.state.groupBy === props.column.name ? {color: "#3f51b5"}: {}}
        />
    );

    private readonly summaryItems: SummaryItem[] = [
        { columnName: 'date', type: 'count' },
        { columnName: 'amount', type: 'sum'},
    ]

    private readonly columns: Column[] = [
        {title: 'Row', name: 'id'},
        {title: 'Posted Date', name: 'date'},
        {title: 'Description', name: 'description'},
        {title: 'Amount', name: 'amount'},
        {title: 'Fund', name: 'fund'},
        {title: 'Division', name: 'division'},
        {title: 'Department', name: 'department'},
        {title: 'Event', name: 'event'},
        {title: 'GL', name: 'gl'},
    ]

    private readonly tableColumnExtension: VirtualTable.ColumnExtension[] = [
        {columnName: 'id',          wordWrapEnabled:true},
        {columnName: 'date',        wordWrapEnabled:true},
        {columnName: 'department',  wordWrapEnabled:true},
        {columnName: 'fund',        wordWrapEnabled:true},
        {columnName: 'division',    wordWrapEnabled:true},
        {columnName: 'event',       wordWrapEnabled:true},
        {columnName: 'gl',          wordWrapEnabled:true},
        {columnName: 'description', wordWrapEnabled:true},
        {columnName: 'amount',      wordWrapEnabled:true},
    ]

    private readonly groupSummaryItems: GroupSummaryItem[] = [
        { columnName: 'amount', type: 'sum', showInGroupFooter: false, alignByColumn: true},
        { columnName: 'amount', type: 'sum', showInGroupFooter: true},
        { columnName: 'date', type: 'count', showInGroupFooter: true},
    ]

    private readonly groupExtension: TableGroupRow.ColumnExtension[] = [
        {columnName: 'id',          showWhenGrouped:true},
        {columnName: 'date',        showWhenGrouped:true},
        {columnName: 'department',  showWhenGrouped:true},
        {columnName: 'fund',        showWhenGrouped:true},
        {columnName: 'division',    showWhenGrouped:true},
        {columnName: 'event',       showWhenGrouped:true},
        {columnName: 'gl',          showWhenGrouped:true},
        {columnName: 'description', showWhenGrouped:true},
        {columnName: 'amount',      showWhenGrouped:true},
    ]

    private groupingColumnExtensions: IntegratedGrouping.ColumnExtension[] = [
        {columnName: 'date', criteria: (value) => {
            if (value instanceof Date) {
                const key = dateToYearMonth(value)
                return {key: key}
            } else return {key: ""};
        }}
    ]

    private columnWidth: TableColumnWidthInfo[] = [
        {columnName: 'id',          width: 70},
        {columnName: 'date',        width: 150},
        {columnName: 'fund',        width: 150},
        {columnName: 'division',    width: 150},
        {columnName: 'department',  width: 150},
        {columnName: 'event',       width: 150},
        {columnName: 'gl',          width: 150},
        {columnName: 'description', width: 350},
        {columnName: 'amount',      width: 150},
    ]

    private readonly exporter: React.RefObject<{exportGrid: (options?: object) => void}>

    private groupWeight: Map<string, number>

    private integratedSortingColumnExtensions: IntegratedSorting.ColumnExtension[] = []

    constructor(props: RecordTableProps) {
        super(props);
        this.exporter = React.createRef()

        this.state = {
            sortingState: [{columnName: 'id', direction: 'asc'}],
            groupBy: undefined,
        }

        this.groupWeight = new Map<string, number>()
        if (this.state.groupBy !== undefined && this.state.groupBy !== 'date') {
            this.buildGroupWeightTable()
        }
    }

    componentDidMount() {
        this.props.dataloader.addChangeCallback(() => {
            this.buildGroupWeightTable();
            this.forceUpdate()
        })
    }

    private buildGroupWeightTable() {
        if (this.state.groupBy !== undefined && this.state.groupBy !== 'date') {
            this.groupWeight.clear()
            this.props.dataloader.getCategories(this.state.groupBy).forEach(entry => {
                this.groupWeight.set(entry.text, entry.value)
            })

            this.integratedSortingColumnExtensions = [
                { columnName: this.state.groupBy,
                    compare: (a, b) => (this.groupWeight?.get(a)||0) - (this.groupWeight?.get(b)||0)
                },
            ]
        }
    }

    componentDidUpdate(prevProps: Readonly<RecordTableProps>, prevState: Readonly<RecordTableState>, snapshot?: any): void {
        if (this.state.groupBy != prevState.groupBy) {
            this.buildGroupWeightTable()
            console.log(this.state.groupBy);
            this.setState({
                sortingState: this.getGroupSortingState(),
            })
        }

    }

    render() {
        const rows = this.props.dataloader.getRecords().map((e, i) => {e.id = i; return e})
        if (this.props.hidden === true)
            return <Paper/>
        else return (
            <Paper elevation={0}>
                <Grid rows={rows} columns={this.columns}>
                    <SortingState
                        sorting={this.state.sortingState}
                    />
                    <GroupingState
                        grouping={this.state.groupBy !== undefined ? [{columnName: this.state.groupBy}]:[]}
                    />
                    <SearchState/>
                    <SummaryState totalItems={this.summaryItems} groupItems={this.groupSummaryItems}/>

                    <IntegratedGrouping columnExtensions={this.groupingColumnExtensions}/>
                    <IntegratedFiltering />
                    <IntegratedSorting columnExtensions={this.integratedSortingColumnExtensions}/>
                    <IntegratedSummary />

                    <DataTypeProvider for={['amount']} formatterComponent={CurrencyFormatter} />
                    <DataTypeProvider for={['date']} formatterComponent={DateFormatter} />

                    <VirtualTable columnExtensions={this.tableColumnExtension}/>
                    <TableColumnResizing
                        defaultColumnWidths={this.columnWidth}
                    />
                    <TableColumnVisibility
                        defaultHiddenColumnNames={['id']}
                    />
                    <TableHeaderRow cellComponent={this.TableHeaderCell}/>
                    <TableGroupRow
                        contentComponent={DateGroupFormatter}
                        columnExtensions={this.groupExtension}
                        />
                    <TableSummaryRow />

                    <Toolbar />
                    <GroupingPanel showSortingControls emptyMessageComponent={() => <span/>}/>
                    <SearchPanel />
                    <ExportPanel startExport={(options) => this.exporter.current?.exportGrid(options)} />
                </Grid>
                <GridExporter
                    ref={this.exporter}
                    columns={this.columns}
                    rows={rows}
                    onSave={(workbook) => this.onSave(workbook)}
                />
            </Paper>
        )
    }

    private setSorting(sorts: Column) {
        if (isOfTypeTabs(sorts.name)) {
            this.props.onChange(sorts.name);
        } else if (sorts.name == 'description') {
            this.props.onChange('keyword');
        }
    }

    private onSave(workbook: Workbook){
        workbook.xlsx.writeBuffer().then((buffer) => {
            saveAs(new Blob([buffer], { type: 'application/octet-stream' }),
                `Transactions-${Datasets.getInstance().getCurrentDatasetName()}.xlsx` );
        });
    }

    private getGroupSortingState(category: string | undefined = this.state.groupBy): Sorting[] {
        if (category === 'date')
            return [{columnName: 'date', direction: "asc"}]
        else if (category === undefined || category === 'description')
            return [{columnName: 'id', direction: 'asc'}]
        else return [{columnName: category, direction: 'desc'}]
    }

}
