import {obstacles} from './physics.js?v=2';
// Cinematic 2.5D presentation. Simulation and assessment live in game.js/core.js.
export class CinematicStage {
  constructor(canvas) { this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.images={}; this.lastX=-1.8; this.face=1; }
  async load(progress) {
    let count=0;
    await Promise.all(Object.entries({room:'room-cinematic.png',room2:'room2-cinematic.png',child:'child-cinematic.png',walk:'child-walk.png',wardenWalk:'warden-walk.png',warden:'warden-cinematic.png'}).map(async([key,file])=>{
      const img=new Image(); img.src=new URL('./'+file,import.meta.url).href; await img.decode(); this.images[key]=img; progress(++count);
    }));
    this.resize();
  }
  resize(){this.dpr=Math.min(devicePixelRatio,2);this.canvas.width=Math.round(innerWidth*this.dpr);this.canvas.height=Math.round(innerHeight*this.dpr);}
  draw({player,warden,state,time,active,started,paused,reduced}) {
    const c=this.ctx,W=innerWidth,H=innerHeight,d=this.dpr;c.setTransform(d,0,0,d,0,0);c.fillStyle='#0b1015';c.fillRect(0,0,W,H);
    // Preserve the reference composition instead of stretching its camera perspective.
    const ratio=this.images.room.width/this.images.room.height;
    const h=Math.min(H,W/ratio),w=h*ratio,ox=(W-w)/2,oy=(H-h)/2;
    const level=player.position.x>=5?1:0;
    c.save();c.translate(ox,oy);c.drawImage(level?this.images.room2:this.images.room,0,0,w,h);
    const min=level?5:-3,max=level?19:5;
    const xFor=x=>w*(.10+.80*(x-min)/(max-min));
    // The second chamber shares the architectural set but changes the light and activity marker.
    if(level){c.fillStyle='rgba(15,38,49,.15)';c.fillRect(0,0,w,h);}
    if(!reduced){c.save();c.globalCompositeOperation='screen';for(let i=0;i<35;i++){const px=(i*.137*w+Math.sin(time*.12+i)*w*.018)%w;const py=h*(.27+((i*.097+time*.003)% .48));c.fillStyle=`rgba(255,218,161,${.12+(i%4)*.04})`;c.beginPath();c.arc(px,py,Math.max(.6,h*.0012),0,7);c.fill();}c.restore();}
    const drawPerson=(img,x,foot,size,flip,opacity=1,crouch=1,bob=0,frame=-1)=>{
      const ih=h*size*crouch,iw=ih*(frame>=0?img.width/6:img.width)/img.height;
      c.save();c.globalAlpha=opacity;
      c.fillStyle='rgba(4,8,12,.40)';c.beginPath();c.ellipse(x,foot,iw*.36,h*.012,0,0,7);c.fill();
      c.translate(x,foot-bob);c.scale(flip,1);if(frame>=0&&img===this.images.wardenWalk){const sw=img.width/6,sy=img.height*.102,sh=img.height*.84;const dw=ih*sw/sh;c.drawImage(img,frame*sw,sy,sw,sh,-dw/2,-ih,dw,ih);}else if(frame>=0){const edges=[0,405,735,1075,1500,1840,2172],anchors=[190,550,920,1270,1640,2010];const sx=edges[frame]/2172*img.width,sw=(edges[frame+1]-edges[frame])/2172*img.width,anchor=anchors[frame]/2172*img.width,scale=ih/img.height;c.drawImage(img,sx,0,sw,img.height,(sx-anchor)*scale,-ih,sw*scale,ih);}else c.drawImage(img,-iw/2,-ih,iw,ih);c.restore();
    };
    const delta=player.position.x-this.lastX;
    if(Math.abs(delta)>.0001)this.face=delta>0?1:-1;
    const walking=started&&!paused&&active<0&&player.userData.walking&&player.userData.grounded;
    this.lastX=player.position.x;
    // Render the same boxes used by the collision solver.
    for(const o of obstacles.filter(o=>o.kind==='crate'&&(level?o.x0>=5:o.x0<5))){
      const left=xFor(o.x0),right=xFor(o.x1),bottom=h*(.80+(o.z1-1.8)*.025),top=bottom-o.height*h*.09;
      c.save();c.fillStyle='#694324';c.strokeStyle='#bc8b50';c.lineWidth=2;c.shadowColor='#080b0f';c.shadowBlur=9;c.fillRect(left,top,right-left,bottom-top);c.shadowBlur=0;c.strokeRect(left,top,right-left,bottom-top);
      c.beginPath();c.moveTo(left,top);c.lineTo(right,bottom);c.moveTo(right,top);c.lineTo(left,bottom);c.stroke();c.fillStyle='#cda065';c.fillRect(left,top,right-left,3);c.restore();
    }
    const px=xFor(player.position.x),foot=h*(.80+(player.position.z-1.8)*.025);
    // A distant figure behind the frosted door establishes the threat before pursuit.
    if(!started){drawPerson(this.images.warden,w*.945,h*.66,.43,1,.28);}
    else {const wx=xFor(warden.position.x);if(wx>-w*.1&&wx<w*1.1)drawPerson(this.images.wardenWalk,wx,h*.81,.54,warden.position.x>player.position.x?1:-1,.88,1,0,Math.floor((warden.userData.walkDistance||0)*4)%6);}
    drawPerson(walking?this.images.walk:this.images.child,started?px:w*.33,started?foot:h*.82,.40,this.face,1,player.scale.y,(reduced?0:(walking?Math.abs(Math.sin(time*11))*h*.006:Math.sin(time*1.8)*h*.001))+Math.max(0,player.position.y-.06)*h*.09,walking?Math.floor((player.userData.walkDistance||0)*5)%6:-1);
    const keyX=xFor(level?9:1),keyY=h*.58;
    if(!state.keys[level]){
      c.save();c.translate(keyX,keyY+(reduced?0:Math.sin(time*1.5)*h*.005));c.strokeStyle='#fff0ce';c.lineWidth=Math.max(1.5,h*.002);c.shadowColor='#ffc86d';c.shadowBlur=15;
      c.beginPath();c.arc(0,0,h*.035,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,-h*.008,h*.009,0,Math.PI*2);c.moveTo(0,0);c.lineTo(0,h*.022);c.lineTo(h*.01,h*.022);c.moveTo(0,h*.014);c.lineTo(h*.009,h*.014);c.stroke();c.restore();
    }
    // Subtle stage title: instructional content remains in the accessible DOM panel.
    if(started){c.save();c.font=`${Math.max(12,h*.017)}px "Microsoft JhengHei",sans-serif`;c.textAlign='center';c.fillStyle='#f8e5c4';c.shadowColor='#000';c.shadowBlur=6;c.fillText(level?'02 / 願望種子 · 分配與風險':'01 / 金幣採買 · 需要與想要',w*.52,h*.12);c.restore();}
    if(state.keys.every(Boolean)){c.save();c.strokeStyle='#f5d099';c.lineWidth=2;c.shadowColor='#ffcf83';c.shadowBlur=20;c.strokeRect(w*.735,h*.20,w*.15,h*.53);c.restore();}
    if(active>=0){const distance=Math.abs(warden.position.x-player.position.x);if(distance<3){c.fillStyle=`rgba(104,30,20,${Math.max(0,(3-distance)*.045)})`;c.fillRect(0,0,w,h);}}
    c.restore();
  }
}
