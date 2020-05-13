import {KMFormat} from "./util";
import * as Papa from 'papaparse';

interface DataEntry {
    date: Date,
    fund: string,
    division: string,
    department: string,
    gl: string,
    event: string,
    description: string,
    amount: number,
    words: string[]
}

interface WordEntry {
    text: string,
    value: number
}

interface Filter {
    category: string,
    name: string,
    index: Set<number>,
    amount: number,
}

export interface DataloaderProps {
    dataloader: Dataloader,
    style?: Object,
}

export default class Dataloader{

    private data: DataEntry[] = []
    #filters: Filter[] = []
    #dataChangeCallbacks: (()=> void)[] = []
    #dataset: string
    #total_amount: number = 0

    constructor(dataset : string) {
        this.#dataset = dataset
        Papa.parse(window.location.pathname + "/expense_summary_"+ dataset +".csv",
            {
                download: true,
                header: true,
                complete: (results)=> {
                    this.data = results.data.map((e) => {
                        e.date = new Date(Number.parseFloat(e.date) * 1000)
                        e.amount = Number.parseFloat(e.amount)
                        e.words = e.__parsed_extra || []
                        return e
                    })

                    this.onLoad()
                }
            })
    }

    private onLoad() {
        this.#total_amount = this.data.reduce((prev, curr) => prev + curr.amount, 0)
        this.listChangeCallback()
    }

    listChangeCallback() {
        this.#dataChangeCallbacks.forEach(c => c())
    }

    addChangeCallback(callback: () => void) {
        this.#dataChangeCallbacks.push(callback)
    }

    getRecords(): DataEntry[] {
        if (this.data.length === 0) {
            return [];
        }

        if (this.#filters.length === 0) {
            return this.data
        }

        const indexes = this.#filters[this.#filters.length - 1].index
        return this.data.filter((e, i) => indexes.has(i))
    }

    getWordList() : WordEntry[] {
        if (this.data.length === 0) {
            return [];
        }

        let words_set = new Map<string, number>()
        this.getRecords().forEach(row => {
            row.words.forEach(w => {
                words_set.set(w, (words_set.get(w) || 0) + row.amount);
            })
        })

        let words_list: WordEntry[] = []
        for (let [word, val] of words_set.entries()) {
            words_list.push({text: word, value: val})
        }

        words_list.sort((a, b) => a.value - b.value)

        return words_list
    }

    getTotal(): number {
        if (this.#filters.length === 0) {
            return this.#total_amount
        }
        return this.#filters[this.#filters.length - 1].amount
    }

    getDatasetTotal(): number {
        return this.#total_amount
    }

    getFilters(){
        return this.#filters
    }

    sliceFilter(remaining_length: number) {
        this.#filters = this.#filters.slice(0, remaining_length)
        this.listChangeCallback()
    }

    addkeywordFilter(word: string) {
        if (this.data.length === 0) return
        if (this.#filters.reduce((prev, curr) => prev || (curr.category === 'keyword' && curr.name === word), false))
            return

        let word_index: Set<number>
        if (this.#filters.length !== 0) {
            const last_index = this.#filters[this.#filters.length - 1].index
            word_index = new Set([...last_index].filter(i => this.data[i].words.includes(word)))
        } else {
            word_index = new Set(this.data.map((e, i) => i)
                .filter(i => this.data[i].words.includes(word)))
        }

        this.#filters.push({
            category: 'keyword',
            name: word,
            index: word_index,
            amount: this.data.filter((e, i) => word_index.has(i))
                .reduce((prev, curr) => prev + curr.amount, 0)
        })

        this.listChangeCallback()
    }

    addCategoryFilter(category: string, value: string) {
        if (this.data.length === 0) return

        let new_index: Set<number>
        if (this.#filters.length !== 0) {
            const last_index = this.#filters[this.#filters.length - 1].index
            // @ts-ignore
            new_index = new Set([...last_index].filter(i => this.data[i][category] === value))
        } else {
            // @ts-ignore
            new_index = new Set(this.data.map((e, i) => i).filter(i => this.data[i][category] === value))
        }

        this.#filters.push({
            category: category,
            name: value,
            index: new_index,
            amount: this.data.filter((e, i) => new_index.has(i))
                .reduce((prev, curr) => prev + curr.amount, 0)
        })

        this.listChangeCallback()
    }

    addAmountFilter(low: number, high: number) {
        if (this.data.length === 0) return

        let word_index: Set<number>
        if (this.#filters.length !== 0) {
            if (this.#filters[this.#filters.length - 1].category === 'amount') {
                this.#filters = this.#filters.slice(0, -1)
            }
            const last_index = this.#filters[this.#filters.length - 1].index
            word_index = new Set([...last_index]
                .filter((i) => low <= this.data[i].amount && this.data[i].amount <= high))
        } else {
            word_index = new Set(this.data.map((e, i) => i)
                .filter((i) => low <= this.data[i].amount && this.data[i].amount <= high))
        }

        this.#filters.push({
            category: 'amount',
            name: KMFormat(low) + "~" + KMFormat(high),
            index: word_index,
            amount: this.data.filter((e, i) => word_index.has(i))
                .reduce((prev, curr) => prev + curr.amount, 0)
        })

        this.listChangeCallback()
    }
}