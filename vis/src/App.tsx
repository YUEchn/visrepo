import React from 'react';
import {BrowserRouter, Route, Routes} from "react-router-dom";
import './App.css';
import Main from './components/main/index.tsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
         path="/"
         element={<Main />}
        ></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
