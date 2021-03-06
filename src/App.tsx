import React from 'react';
import './App.css';
import TopBar from "./components/TopBar";
import DatasetView from "./components/DatasetView"
import DataLoader from "./models/DataLoader";
import Datasets from "./models/Datasets";
import {Container, CssBaseline, Link} from "@material-ui/core";
import ContactSupportIcon from '@material-ui/icons/ContactSupport';
import Footer from "./components/Footer";

interface AppState {
    loader: DataLoader
}

class App extends React.Component<{}, AppState> {

    constructor(props: {}) {
        super(props);
        this.state = {
            loader: Datasets.getInstance().getDataLoader()
        }
    }

    componentDidMount(): void {
        Datasets.getInstance().addChangeCallback(() => {
            this.setState({
                loader: Datasets.getInstance().getDataLoader()
            })
        })
    }

    render() {
        return (
            <div>
                <CssBaseline />
                <TopBar />
                <Container maxWidth="lg">
                    <DatasetView loader={this.state.loader} />
                    <Footer />
                </Container>
            </div>
        );
    }
}

export default App;
