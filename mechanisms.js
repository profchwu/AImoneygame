// Financial mechanisms: every move conserves the available coins.
export const designs=[
 [
  {title:'生活供電盤',note:'牆上便條：午餐需要 40、車票需要 20。今天只有 80，未來至少留下 20。午餐、車票與儲蓄燈都亮起才能打開閘門。',labels:['午餐電路','車票電路','玩具電路'],total:80,step:10,goal:'把金幣搬到電路；未投入的錢會留在儲蓄槽。'},
  {title:'找零齒輪箱',note:'收據：付款 100；午餐 40、車票 20。抽屜只有 1 枚 20 元、4 枚 5 元、2 枚 10 元。湊出正確找零，讓天平平衡。',labels:['20 元齒輪','5 元齒輪','10 元齒輪'],total:60,step:1,goal:'按 ＋ 放入一枚，按 − 取回。金幣面額決定齒輪重量。'},
  {title:'四週儲蓄橋',note:'橋中央的願望書要 60。每週收入 25、生活支出 10；四週都要有儲蓄，才有四塊橋板。',labels:['第 1 週','第 2 週','第 3 週','第 4 週'],total:60,step:5,goal:'分別轉動四個存錢輪；每週最多留下當週可儲蓄的錢。'}
 ],[
  {title:'暴雨緊急閘',note:'共有 100。保留生活費 40，修鞋要 20、修屋頂要 20。投資中的錢在暴雨期間無法取出。先配置，再拉下暴雨拉桿。',labels:['生活費箱','備用金箱','種子計畫'],total:100,step:10,goal:'用備用金承受兩次突發支出，同時保住生活費並留下種子資金。'},
  {title:'廣告查證線路',note:'廣告聲稱：① 永遠賺錢　② 隨時取回　③ 大人查證。帳冊紀錄已散開，把每一句連接到能查證它的資料，再啟動驗證。',labels:['① 永遠賺錢','② 隨時取回','③ 大人查證'],records:['提款要等三個月','學校合作社已核對','雨季曾虧損 10 枚'],total:0,step:1,goal:'轉動接線輪配對證據。不是找好聽的話，要找到相關紀錄。'},
  {title:'晴雨種子引擎',note:'100 枚中至少留 40 備用；兩個花床都要種子。晴天 A 每 10 枚增加 1、B 增加 2；雨天 A 每 10 枚減少 1、B 減少 3。雨天後總資產至少 90 才能運作。',labels:['花床 A','花床 B'],total:100,step:10,goal:'配置種子後分別拉晴天、雨天拉桿，觀察同一配置的資產變化。'}
 ]];
export function createMechanism(stage,index){return {stage,index,values:Array(designs[stage][index].labels.length).fill(0),trials:[]};}
export function moveCoin(m,index,direction){if(![1,-1].includes(direction)||index<0||index>=m.values.length)return false;const d=designs[m.stage][m.index];if(m.stage===1&&m.index===1){m.values[index]=(m.values[index]+direction+3)%3;m.trials=[];return true;}const step=d.step,old=m.values[index],next=old+step; if(direction<0){if(old<step)return false;m.values[index]-=step;}else{if(m.stage===0&&m.index===1){if(next>[1,4,2][index])return false;}else if(m.stage===0&&m.index===2){if(next>15)return false;}else if(m.values.reduce((a,b)=>a+b,0)+step>d.total)return false;m.values[index]=next;}m.trials=[];return true;}
export function mechanismView(m){const v=m.values,d=designs[m.stage][m.index],sum=v.reduce((a,b)=>a+b,0);if(m.stage===0&&m.index===1)return {amount:v[0]*20+v[1]*5+v[2]*10,target:40};if(m.stage===1&&m.index===2){const cash=100-sum;return {cash,sun:cash+v[0]*1.1+v[1]*1.2,rain:cash+v[0]*.9+v[1]*.7};}return {cash:d.total-sum,amount:sum};}
export function testMechanism(m,trial='activate'){if(!m.trials.includes(trial))m.trials.push(trial);const v=m.values,r=mechanismView(m);let pass=false,message='機關還沒有對齊。對照便條，調整配置後再試。';
 if(m.stage===0&&m.index===0){pass=v[0]===40&&v[1]===20&&r.cash>=20;message=`午餐 ${v[0]}/40，車票 ${v[1]}/20，儲蓄 ${r.cash}/20。`;}
 if(m.stage===0&&m.index===1){pass=r.amount===40;message=`找零盤 ${r.amount}，收據差額 ${100-40-20}；${r.amount===40?'天平平衡！':r.amount<40?'少找錢了。':'多找錢了。'}`;}
 if(m.stage===0&&m.index===2){pass=v.every(x=>x===15);message=`橋板 ${v.filter(x=>x===15).length}/4；每週可存 25−10＝15，總儲蓄 ${r.amount}/60。`;}
 if(m.stage===1&&m.index===0){pass=v[0]>=40&&v[1]>=40&&v[2]>=10&&trial==='storm';message=`暴雨花掉備用金 40：${v[1]>=40?'修復完成':'備用金不足'}。生活費 ${v[0]}/40，種子 ${v[2]}/10。`;}
 if(m.stage===1&&m.index===1){pass=v[0]===2&&v[1]===0&&v[2]===1;message=pass?'兩個承諾與紀錄矛盾！查證線路切斷了可疑匯款，安全閘門已開。':'接線不對：用虧損紀錄查報酬、提款條款查流動性、核對紀錄查來源。';}
 if(m.stage===1&&m.index===2){pass=v.every(x=>x>=10)&&r.cash>=40&&r.rain>=90&&m.trials.includes('sun')&&m.trials.includes('rain');message=`${trial==='sun'?'晴天':'雨天'}資產 ${r[trial==='sun'?'sun':'rain'].toFixed(0)}；備用金 ${r.cash}，雨天安全線 90。需測試同一配置的兩種天氣。`;}
 return {pass,message,observation:m.stage===1&&m.index===2&&v.every(x=>x>=10)&&r.cash>=40&&r.rain>=90&&!pass};
}
