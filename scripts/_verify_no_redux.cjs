// One-time verification: scan src/ + App.tsx for any REMAINING
// redux *code* references (imports, calls, etc.). Comments are
// fine — they're historical markers. Expected output:
// "code matches: 0".

const fs = require('fs');
const path = require('path');

// Patterns that would indicate ACTIVE redux code:
//   - import { ... } from '@reduxjs/toolkit'
//   - import 'react-redux'
//   - import 'redux-persist'
//   - import 'redux-logger'
//   - createSlice(
//   - createAsyncThunk(
//   - createAction(
//   - useAppSelector(
//   - useAppDispatch(
//   - combineReducers(
//   - useSelector(
//   - useDispatch(
//   - <Provider store=
//   - <PersistGate
//   - persistReducer(
//   - persistStore(
//   - redux-logger imports
const patterns = [
  {re: /^\s*import\s+[^'"]*from\s+['"]@reduxjs\/toolkit['"]/m, name: '@reduxjs/toolkit import'},
  {re: /^\s*import\s+[^'"]*from\s+['"]react-redux['"]/m, name: 'react-redux import'},
  {re: /^\s*import\s+[^'"]*from\s+['"]redux-persist/m, name: 'redux-persist import'},
  {re: /^\s*import\s+[^'"]*from\s+['"]redux-logger/m, name: 'redux-logger import'},
  {re: /\bcreateSlice\s*\(/g, name: 'createSlice call'},
  {re: /\bcreateAsyncThunk\s*\(/g, name: 'createAsyncThunk call'},
  {re: /\bcreateAction\s*\(/g, name: 'createAction call'},
  {re: /\buseAppSelector\s*\(/g, name: 'useAppSelector call'},
  {re: /\buseAppDispatch\s*\(/g, name: 'useAppDispatch call'},
  {re: /\bcombineReducers\s*\(/g, name: 'combineReducers call'},
  {re: /\buseSelector\s*\(/g, name: 'useSelector call'},
  {re: /\buseDispatch\s*\(/g, name: 'useDispatch call'},
  {re: /<Provider\s+store=/g, name: '<Provider store= JSX'},
  {re: /<PersistGate/g, name: '<PersistGate JSX'},
  {re: /\bpersistReducer\s*\(/g, name: 'persistReducer call'},
  {re: /\bpersistStore\s*\(/g, name: 'persistStore call'},
];

let total = 0;
function walk(d) {
  for (const e of fs.readdirSync(d, {withFileTypes: true})) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      walk(p);
    } else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) {
      const c = fs.readFileSync(p, 'utf8');
      for (const {re, name} of patterns) {
        const matches = c.match(re);
        if (matches) {
          total += matches.length;
          console.log(p + ' :: ' + name + ' :: ' + matches[0]);
        }
      }
    }
  }
}
walk('src');
try {
  const c = fs.readFileSync('App.tsx', 'utf8');
  for (const {re, name} of patterns) {
    const matches = c.match(re);
    if (matches) {
      total += matches.length;
      console.log('App.tsx :: ' + name + ' :: ' + matches[0]);
    }
  }
} catch (e) {}
console.log('---');
console.log('code matches:', total);
