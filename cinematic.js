import {roomObstacles,stations,EXIT,ALTAR,LENGTH} from './world.js?v=4';
// Cinematic 2.5D presentation. Simulation and assessment live in game.js/core.js.
export class CinematicStage {
  constructor(canvas) { this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.images={}; this.lastX=-1.8; this.face=1; }
  async load(progress) {
    let count=0;
    await Promise.all(Object.entries({room:'room-cinematic.png',room2:'room2-cinematic.png',child:'child-cinematic.png',walk:'child-walk.png',wardenWalk:'warden-walk.png',warden:'warden-cinematic.png'}).map(async([key,file])=>{
      const img=new Image(); img.src=new URL('./'+file+'?v=4',import.meta.url).href; await img.decode(); this.images[key]=img; progress(++count);
    }));
    this.resize();
  }
  resize(){this.dpr=Math.min(devicePixelRatio,2);this.canvas.width=Math.round(innerWidth*this.dpr);this.canvas.height=Math.round(innerHeight*this.dpr);}
  draw({player,warden,state,time,active,started,paused,reduced,doorTime=0}) {
    const c=this.ctx,W=innerWidth,H=innerHeight,d=this.dpr;c.setTransform(d,0,0,d,0,0);c.fillStyle='#0b1015';c.fillRect(0,0,W,H);
    // Preserve the reference composition instead of stretching its camera perspective.
    const ratio=16/9;
    const h=Math.min(H,W/ratio),w=h*ratio,ox=(W-w)/2,oy=(H-h)/2;
    const level=state.stage||0,view=14,cam=Math.max(0,Math.min(LENGTH-view,player.position.x-5));
    const xFor=x=>(x-cam)/view*w;
    c.save();c.translate(ox,oy);c.beginPath();c.rect(0,0,w,h);c.clip();
    c.drawImage(level?this.images.room2:this.images.room,-cam/view*w,0,LENGTH/view*w,h);
    if(!reduced){c.save();c.globalCompositeOperation='screen';for(let i=0;i<35;i++){const px=(i*.137*w+Math.sin(time*.12+i)*w*.018)%w;const py=h*(.27+((i*.097+time*.003)% .48));c.fillStyle=`rgba(255,218,161,${.12+(i%4)*.04})`;c.beginPath();c.arc(px,py,Math.max(.6,h*.0012),0,7);c.fill();}c.restore();}
    const drawPerson=(img,x,foot,size,flip,opacity=1,crouch=1,bob=0,frame=-1)=>{
      const ih=h*size*crouch,iw=ih*(frame>=0?img.width/6:img.width)/img.height;
      c.save();c.globalAlpha=opacity;
      c.fillStyle='rgba(4,8,12,.40)';c.beginPath();c.ellipse(x,foot,iw*.36,h*.012,0,0,7);c.fill();
      c.translate(x,foot-bob);c.scale(flip,1);if(frame>=0&&img===this.images.wardenWalk){const sw=img.width/6,sy=img.height*.102,sh=img.height*.84;const dw=ih*sw/sh;c.drawImage(img,frame*sw,sy,sw,sh,-dw/2,-ih,dw,ih);}else if(frame>=0){const edges=[0,400,722,1074,1492,1805,2172],anchors=[180,545,903,1268,1630,1985];const sx=edges[frame]/2172*img.width,sw=(edges[frame+1]-edges[frame])/2172*img.width,anchor=anchors[frame]/2172*img.width,scale=ih/img.height;c.drawImage(img,sx,0,sw,img.height,(sx-anchor)*scale,-ih,sw*scale,ih);}else c.drawImage(img,-iw/2,-ih,iw,ih);c.restore();
    };
    const delta=player.position.x-this.lastX;
    if(Math.abs(delta)>.0001)this.face=delta>0?1:-1;
    const walking=started&&!paused&&active<0&&player.userData.walking&&player.userData.grounded;
    this.lastX=player.position.x;
    // Visible silhouettes share exact world footprints with the collision solver.
    for(const o of roomObstacles(level)){
      const left=xFor(o.x0),right=xFor(o.x1),bottom=h*(.80+(o.z1-1.8)*.07),top=bottom-o.height*h*.15;
      c.save();const grad=c.createLinearGradient(left,top,right,bottom);grad.addColorStop(0,level?'#556551':'#8a6341');grad.addColorStop(.5,'#4f3526');grad.addColorStop(1,'#2c211c');c.fillStyle=grad;c.strokeStyle='#ae8b59';c.lineWidth=1.5;c.shadowColor='#080b0f';c.shadowBlur=12;c.fillRect(left,top,right-left,bottom-top);c.shadowBlur=0;c.strokeRect(left,top,right-left,bottom-top);
      c.strokeStyle='#b08d5b66';for(let g=1;g<6;g++){c.beginPath();c.moveTo(left+(right-left)*g/6,top);c.lineTo(left+(right-left)*g/6,bottom);c.stroke();}
      c.fillStyle='#261c16';c.fillRect(left,top+5,right-left,4);c.fillRect(left,bottom-9,right-left,4);c.fillStyle='#b9a079';for(const bx of [left+5,right-7]){c.fillRect(bx,top+6,3,3);c.fillRect(bx,bottom-8,3,3);}c.restore();
    }
    for(const [i,q] of stations[level].entries()){
      const x=xFor(q.x),y=h*.64,done=state.clues[level][i];c.save();c.shadowColor=done?'#9ae0b4':'#ffc96d';c.shadowBlur=20;c.fillStyle=done?'#294c40':'#3b2d20';c.strokeStyle=done?'#a9e4bb':'#f5ce82';c.lineWidth=2;c.fillRect(x-20,y-25,40,48);c.strokeRect(x-20,y-25,40,48);c.fillStyle='#fff0d4';c.font='bold 18px sans-serif';c.textAlign='center';c.fillText(done?'✓':String(i+1),x,y+5);c.font='12px "Microsoft JhengHei"';c.fillText(q.title,x,y+44);c.restore();
    }
    const doorX=xFor(EXIT),doorY=h*.28,doorW=w*.09,doorH=h*.53,opening=Math.min(1,doorTime/.95);
    c.save();c.fillStyle='#080e13';c.fillRect(doorX-doorW/2,doorY,doorW,doorH);c.strokeStyle='#b89662';c.lineWidth=5;c.strokeRect(doorX-doorW/2,doorY,doorW,doorH);
    const dw=doorW*(1-opening*.94),doorGrad=c.createLinearGradient(doorX-doorW/2,0,doorX+doorW/2,0);doorGrad.addColorStop(0,'#233a3d');doorGrad.addColorStop(.6,'#4e5146');doorGrad.addColorStop(1,'#1b292c');c.fillStyle=doorGrad;c.fillRect(doorX-doorW/2,doorY,dw,doorH);c.strokeStyle='#897657';c.lineWidth=2;c.strokeRect(doorX-doorW/2+dw*.12,doorY+12,dw*.76,doorH-24);c.fillStyle='#ffdc9c';c.beginPath();c.arc(doorX-doorW/2+dw*.83,doorY+doorH*.6,4,0,7);c.fill();if(opening){c.fillStyle=`rgba(245,213,149,${opening*.45})`;c.fillRect(doorX-doorW/2+dw,doorY,doorW-dw,doorH);}c.restore();
    const px=xFor(player.position.x),foot=h*(.80+(player.position.z-1.8)*.07);
    // A distant figure behind the frosted door establishes the threat before pursuit.
    if(!started){drawPerson(this.images.warden,w*.945,h*.66,.43,1,.28);}
    else {const wx=xFor(warden.position.x);if(wx>-w*.1&&wx<w*1.1)drawPerson(this.images.wardenWalk,wx,h*(.80+(warden.position.z-1.8)*.07),.46,warden.position.x>player.position.x?1:-1,1,1,0,Math.floor((warden.userData.walkDistance||0)*4)%6);}
    drawPerson(this.images.walk,started?px:w*.33,started?foot:h*.82,.34,this.face,1,player.scale.y,(reduced?0:(walking?Math.abs(Math.sin(time*11))*h*.006:Math.sin(time*1.8)*h*.001))+Math.max(0,player.position.y-.06)*h*.15,walking?Math.floor((player.userData.walkDistance||0)*5)%6:1);
    const keyX=xFor(ALTAR),keyY=h*.58;
    if(!state.keys[level]){
      c.save();c.translate(keyX,keyY+(reduced?0:Math.sin(time*1.5)*h*.005));c.strokeStyle='#fff0ce';c.lineWidth=Math.max(1.5,h*.002);c.shadowColor='#ffc86d';c.shadowBlur=15;
      c.beginPath();c.arc(0,0,h*.035,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,-h*.008,h*.009,0,Math.PI*2);c.moveTo(0,0);c.lineTo(0,h*.022);c.lineTo(h*.01,h*.022);c.moveTo(0,h*.014);c.lineTo(h*.009,h*.014);c.stroke();c.restore();
    }
    // Subtle stage title: instructional content remains in the accessible DOM panel.
    if(started){c.save();c.font=`${Math.max(12,h*.017)}px "Microsoft JhengHei",sans-serif`;c.textAlign='center';c.fillStyle='#f8e5c4';c.shadowColor='#000';c.shadowBlur=6;c.fillText(level?'02 / 月光溫室 · 風險與未來':'01 / 午夜玩具商廊 · 預算與儲蓄',w*.52,h*.12);c.restore();}
    if(active>=0){const distance=Math.abs(warden.position.x-player.position.x);if(distance<3){c.fillStyle=`rgba(104,30,20,${Math.max(0,(3-distance)*.045)})`;c.fillRect(0,0,w,h);}}
    if(doorTime>1){c.fillStyle=`rgba(4,9,13,${Math.min(1,(doorTime-1)/.65)})`;c.fillRect(0,0,w,h);}
    c.restore();
  }
}
