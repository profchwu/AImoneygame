import {designs} from './mechanisms.js?v=5';
export const LENGTH=34, EXIT=32, ALTAR=27;
export const stations=[
 [{x:5,title:'需要還是想要？',question:'只剩 60 枚，今天還沒吃午餐，也要搭車回家。先買什麼？',choices:['午餐與車票','限量玩具','把錢全部買點心'],answer:0,lesson:'需要優先：先確保吃飯與回家，再安排想要。'},
 {x:13,title:'找零收銀機',question:'付出 100 枚，午餐 40 枚、車票 20 枚，應找回多少？',choices:['20 枚','40 枚','60 枚'],answer:1,lesson:'100 − 40 − 20 = 40。購物後要核對找零。'},
 {x:21,title:'願望存錢筒',question:'想買 60 枚的書，每週存 15 枚，需要幾週？',choices:['2 週','3 週','4 週'],answer:2,lesson:'60 ÷ 15 = 4 週。把大目標分成每週能做到的小計畫。'}],
 [{x:5,title:'緊急備用箱',question:'雨天鞋子壞了，哪筆錢最適合應急？',choices:['預留的備用金','借錢投入高風險計畫','花掉明天的午餐錢'],answer:0,lesson:'先保留生活與緊急需要的錢，再考慮投資。'},
 {x:13,title:'可疑廣告電報',question:'廣告說「保證明天翻倍！立刻匯款！」你會？',choices:['馬上付錢','找可信任的大人一起查證','把所有儲蓄投入'],answer:1,lesson:'保證高報酬又催促付款是警訊。先停下、查證並找可信任的大人。'},
 {x:21,title:'風險天氣站',question:'把錢分到不同計畫，是否就一定不會虧損？',choices:['一定賺錢','只有雨天保證賺錢','仍可能虧損'],answer:2,lesson:'分散可以降低集中風險，卻不能保證獲利。'}]
];
stations.forEach((room,l)=>room.forEach((q,i)=>q.title=designs[l][i].title));
export function solved(s){return s.clues[s.stage].every(Boolean);}
export function doorReady(s){return solved(s)&&s.keys[s.stage];}
export function answerStation(s,index,choice){const q=stations[s.stage][index];if(s.clues[s.stage][index])return true;s.exploreAttempts[s.stage]++;const ok=choice===q.answer;if(ok)s.clues[s.stage][index]=true;return ok;}
export function enterDoor(s){if(!doorReady(s))return false;if(s.stage===0){s.stage=1;s.checkpoint=1;return 'next';}return 'finish';}
export function roomObstacles(stage){return [
 {x0:7,x1:8.8,z0:.9,z1:2.05,height:1.1,kind:'cabinet'},
 {x0:10,x1:10.8,z0:2.2,z1:3.1,height:.42,kind:'crate'},
 {x0:15,x1:16.2,z0:1.65,z1:3.1,height:1.05,kind:'cabinet'},
 {x0:18,x1:18.9,z0:.9,z1:1.8,height:.5,kind:'crate'},
 {x0:23,x1:24,z0:.9,z1:3.1,height:.42,kind:'crate'},
 {x0:29,x1:30.1,z0:.9,z1:2.05,height:1.1,kind:'cabinet'},
 ...(stage?[{x0:11.5,x1:12.1,z0:.9,z1:1.8,height:.45,kind:'crate'},{x0:25,x1:25.7,z0:2.2,z1:3.1,height:.45,kind:'crate'}]:[])
 ];}

export const gateXs=[6.7,14.6,22.8];
export function worldSolids(s){return [...roomObstacles(s.stage),...gateXs.flatMap((x,i)=>s.clues[s.stage][i]?[]:[{x0:x-.1,x1:x+.1,z0:.9,z1:3.1,height:2.7,kind:"gate"}])];}
