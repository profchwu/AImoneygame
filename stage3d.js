import * as T from 'three';
import {mergeGeometries} from './BufferGeometryUtils.js';
import {GLTFLoader} from './GLTFLoader.js';
import {roomObstacles,stations,EXIT,LENGTH,ALTAR} from './world.js?v=5';

// One world, one camera and one depth buffer: props, characters and shadows
// all occupy the same coordinates as the collision simulation.
export class CinematicStage{
 constructor(canvas){
  this.canvas=canvas;this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.35;
  this.scene=new T.Scene();this.scene.background=new T.Color('#101b25');this.scene.fog=new T.Fog('#101b25',20,48);
  this.camera=new T.PerspectiveCamera(43,1,.1,80);this.lastX=1;this.face=-Math.PI/2;
  this.materials={};this.rooms=[];this.doors=[];this.gates=[];this.markers=[];this.keys=[];
  this.scene.add(new T.HemisphereLight(0xb9d9f3,0x302315,1.65));
  this.moon=new T.DirectionalLight(0x8eb9eb,2.1);this.moon.position.set(9,9,-4);this.scene.add(this.moon);
  this.keyLight=new T.SpotLight(0xffd39a,95,24,.65,.65,1.6);this.keyLight.castShadow=true;this.keyLight.shadow.mapSize.set(2048,2048);this.keyLight.shadow.bias=-.0004;this.keyLight.shadow.normalBias=.025;this.scene.add(this.keyLight,this.keyLight.target);
  this.rim=new T.PointLight(0x9ccfff,12,13,2);this.scene.add(this.rim);
 }
 material(name,color,kind='wood',metal=0){
  if(this.materials[name])return this.materials[name];
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,256,256);
  let seed=19;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<1100;i++){const a=rand()*.1;c.strokeStyle=`rgba(${rand()>.5?'234,207,161':'12,16,18'},${a})`;c.lineWidth=rand()*2+.3;const x=rand()*256,y=rand()*256;c.beginPath();c.moveTo(x,y);c.lineTo(x+(kind==='wood'?rand()*100:rand()*3),y+rand()*3);c.stroke();}
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;
  return this.materials[name]=new T.MeshStandardMaterial({color:0xffffff,map:texture,bumpMap:texture,bumpScale:kind==='wood'?.006:.012,roughness:metal?.42:.82,metalness:metal});
 }
 box(parent,x,y,z,w,h,d,mat){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 sphere(parent,x,y,z,r,mat,scale=[1,1,1]){const m=new T.Mesh(new T.SphereGeometry(r,16,12),mat);m.position.set(x,y,z);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 rod(parent,a,b,r,mat){const va=new T.Vector3(...a),vb=new T.Vector3(...b),m=new T.Mesh(new T.CylinderGeometry(r,r,va.distanceTo(vb),10),mat);m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vb.sub(va).normalize());m.castShadow=true;parent.add(m);return m;}
 label(parent,text,x,y,z){const cv=document.createElement('canvas');cv.width=512;cv.height=96;const c=cv.getContext('2d');c.fillStyle='#132128ee';c.fillRect(0,0,512,96);c.strokeStyle='#bca478';c.strokeRect(3,3,506,90);c.fillStyle='#f4e2bb';c.font='28px Microsoft JhengHei';c.textAlign='center';c.fillText(text,256,60);const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(2.0,.375),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 makeRoom(level){
  const room=new T.Group();this.scene.add(room);this.rooms.push(room);this.gates[level]=[];this.markers[level]=[];
  const oak=this.material('oak','#65503a'),dark=this.material('trim','#302d27'),iron=this.material('iron','#253b41','plaster',.65),brass=this.material('brass','#9c773a','wood',.7),plaster=this.material('plaster','#45565b','plaster'),green=this.material('leaves','#385b3b','plaster'),clay=this.material('clay','#784934','plaster');
  this.box(room,17,-.13,1,36,.3,9,dark);
  // Actual individual floorboards and staggered joints create perspective.
  for(let row=0;row<15;row++)for(let col=-2;col<13;col++){this.box(room,col*3+(row%2)*1.5-1,.035,row*.46-2.2,2.975,.045,.445,oak);}
  if(!level)this.box(room,17,2.7,-1.75,36,5.4,.3,plaster);
  else{
   const glass=new T.MeshStandardMaterial({color:0x31556c,roughness:.3,metalness:.22,emissive:0x102b3b,emissiveIntensity:.4});
   this.box(room,17,3,-1.8,36,6,.15,glass);
   for(let x=0;x<=34;x+=2){this.box(room,x,3,-1.65,.08,6,.13,iron);this.rod(room,[x,5.7,-1.7],[x,7,1.5],.06,iron);this.rod(room,[x,7,1.5],[x,5.7,5],.06,iron);}
   for(const y of [1.8,3.3,4.8])this.box(room,17,y,-1.55,36,.08,.12,iron);
  }
  for(let x=0;x<35;x+=4){
   this.box(room,x,2.5,-1.25,.22,5,.35,level?iron:dark);this.box(room,x,.17,-1.05,.35,.34,.6,dark);
   if(!level){
    const pane=new T.MeshStandardMaterial({color:0x335271,emissive:0x173553,roughness:.45});this.box(room,x+2,3.35,-1.48,1.85,2.5,.12,dark);this.box(room,x+2,3.35,-1.38,1.62,2.3,.08,pane);this.box(room,x+2,3.35,-1.27,.06,2.3,.1,iron);this.box(room,x+2,3.35,-1.27,1.62,.06,.1,iron);
   }
   // Cabinetry and obstacles share this exact oak/brass material family.
   const sx=x+.65;this.box(room,sx,1.2,-.9,1.3,2.4,.48,dark);
   for(let shelf=0;shelf<4;shelf++){this.box(room,sx,.2+shelf*.6,-.5,1.4,.07,.8,oak);for(let b=0;b<5;b++){const color=['#5b6c60','#765045','#9a8968','#37474d','#6b5e64'][b];const bm=this.material('book'+b,color,'cloth');this.box(room,sx-.48+b*.23,.44+shelf*.6,-.42,.15,.35+(b%3)*.05,.25,bm);}}
   const lampx=x+2.7;this.rod(room,[lampx,0,-.6],[lampx,2.7,-.6],.035,brass);this.box(room,lampx,2.65,-.6,.34,.45,.32,iron);const glow=new T.MeshStandardMaterial({color:0xffe5b4,emissive:0xffb85e,emissiveIntensity:2});this.box(room,lampx,2.65,-.40,.25,.32,.04,glow);const light=new T.PointLight(0xffbc75,7,5,2);light.position.set(lampx,2.7,-.1);
   if(level)for(let p=0;p<3;p++){const px=x+p*.7;const pot=new T.Mesh(new T.CylinderGeometry(.2,.13,.35,12),clay);pot.position.set(px,.22,0);room.add(pot);this.rod(room,[px,.3,0],[px,1.5,0],.018,green);for(let j=0;j<6;j++){const angle=j*2.4;this.sphere(room,px+Math.cos(angle)*.20,.5+j*.15,Math.sin(angle)*.15,.13,green,[1.6,.3,1]);}}
  }
  for(const o of roomObstacles(level)){
   const x=(o.x0+o.x1)/2,z=(o.z0+o.z1)/2,w=o.x1-o.x0,d=o.z1-o.z0,h=o.height;
   const body=this.box(room,x,.06+h/2,z,w,h,d,oak);body.name='solid-'+o.kind;
   // Raised battens, metal straps and rivets sit on the same 3D box.
   for(const xx of [-w*.38,w*.38]){this.box(room,x+xx,.06+h/2,z+d/2+.014,.055,h,.025,dark);for(const yy of [.12,h-.05])this.sphere(room,x+xx,yy,z+d/2+.032,.018,brass);}
   for(const yy of [.10,h+.025])this.box(room,x,yy,z+d/2+.02,w,.055,.045,dark);
   for(let i=1;i<4;i++)this.box(room,x-w/2+w*i/4,.06+h/2,z+d/2+.002,.008,h,.006,dark);
  }
  for(const [i,q] of stations[level].entries()){
   this.box(room,q.x,.62,.25,1.45,1.12,.58,dark);this.box(room,q.x,1.2,.27,1.58,.1,.8,oak);
   for(let j=0;j<3;j++){const ring=new T.Mesh(new T.TorusGeometry(.12,.028,8,20),brass);ring.position.set(q.x-.4+j*.4,.85,.57);room.add(ring);}
   const lamp=new T.MeshStandardMaterial({color:0xffc568,emissive:0xffa640,emissiveIntensity:1});this.markers[level].push(this.sphere(room,q.x,1.48,.25,.11,lamp));this.label(room,`${i+1} · ${q.title}`,q.x,1.95,.3);
   const gx=[6.7,14.6,22.8][i],gate=new T.Group();gate.position.set(gx,0,2);room.add(gate);for(const z of [-1.15,1.15])this.box(room,gx,1.4,2+z,.17,2.8,.17,iron);
   for(let z=-1.0;z<=1.01;z+=.25)this.box(gate,0,1.35,z,.065,2.7,.065,brass);this.box(gate,0,2.65,0,.13,.12,2.3,iron);this.gates[level].push(gate);
  }
  // Batch stationary meshes by material; moving doors, gates and markers remain separate.
  const groups=new Map();room.updateMatrixWorld(true);for(const child of [...room.children]){if(child.isMesh&&child.geometry.type!=='PlaneGeometry'&&!this.markers[level].includes(child)){const geometry=child.geometry.clone().applyMatrix4(child.matrix);const list=groups.get(child.material)||[];list.push(geometry);groups.set(child.material,list);room.remove(child);}}
  for(const [material,geometries] of groups){const mesh=new T.Mesh(mergeGeometries(geometries),material);mesh.castShadow=mesh.receiveShadow=true;room.add(mesh);for(const geometry of geometries)geometry.dispose();}
  this.box(room,ALTAR,.45,.1,1.4,.8,.7,dark);this.box(room,ALTAR,.87,.1,1.5,.08,.8,brass);
  const key=new T.Group();key.position.set(ALTAR,1.5,.1);const ring=new T.Mesh(new T.TorusGeometry(.13,.035,8,20),brass);key.add(ring);this.box(key,0,-.24,0,.055,.3,.06,brass);this.box(key,.06,-.33,0,.15,.05,.06,brass);room.add(key);this.keys[level]=key;this.label(room,'KEY 寶箱 · E',ALTAR,2,.1);
  const door=new T.Group();door.position.set(EXIT-.7,.06,.1);room.add(door);this.box(door,.7,1.4,0,1.4,2.8,.15,oak);for(const y of [.65,2])this.box(door,.7,y,.1,1.1,.9,.07,dark);this.sphere(door,1.2,1.2,.19,.07,brass);this.doors[level]=door;
  for(const x of [EXIT-.85,EXIT+.85])this.box(room,x,1.5,.1,.15,3.0,.4,dark);this.box(room,EXIT,3,.1,1.85,.15,.4,dark);this.label(room,level?'回家的門 · E':'月光溫室 · E',EXIT,3.4,.1);
 }
 rig(model,monster=false){
  model.updateMatrixWorld(true);const parts=[[],[]];model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of (Array.isArray(o.material)?o.material:[o.material])){m.transparent=false;m.opacity=1;m.depthWrite=true;}if(/boot|trouser|warden_leg/.test(o.name)){const p=new T.Vector3();o.getWorldPosition(p);parts[p.x<0?0:1].push(o);}}});
  const legs=parts.map((objects,i)=>{const pivot=new T.Group();pivot.position.set(i? .17:-.17,monster?.95:.7,0);model.add(pivot);model.updateMatrixWorld(true);for(const object of objects)pivot.attach(object);return pivot;});return {model,legs};
 }
 async load(progress){
  this.makeRoom(0);this.makeRoom(1);const loader=new GLTFLoader();
  const child=await loader.loadAsync(new URL('./child.glb?v=5',import.meta.url).href);this.child=this.rig(child.scene);this.scene.add(child.scene);progress(1);
  const enemy=await loader.loadAsync(new URL('./warden3d.glb?v=5',import.meta.url).href);this.enemy=this.rig(enemy.scene,true);this.scene.add(enemy.scene);progress(2);this.resize();
 }
 floorPoint(x,y){const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(x/innerWidth*2-1,-y/innerHeight*2+1),this.camera);const point=new T.Vector3();if(!ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.06),point))return null;point.x=T.MathUtils.clamp(point.x,.5,LENGTH);point.z=T.MathUtils.clamp(point.z,.9,3.1);return point;}
 resize(){this.renderer.setSize(innerWidth,innerHeight,false);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
 draw({player,warden,state,time,active,started,paused,reduced,doorTime=0}){
  const level=state.stage||0;this.rooms.forEach((r,i)=>r.visible=i===level);
  const px=started?player.position.x:4,cx=Math.max(2.8,Math.min(29,px+1.9));
  this.camera.position.set(cx+1,4.2,10.4);this.camera.lookAt(cx,1.55,1.15);
  this.keyLight.position.set(px-2,5.7,4);this.keyLight.target.position.set(px+1,0,1.6);this.rim.position.set(px+2,3,-1);
  const delta=player.position.x-this.lastX;if(Math.abs(delta)>.001)this.face=delta>0?-Math.PI/2:Math.PI/2;this.lastX=player.position.x;
  const animate=(rig,body,phase,moving,angle)=>{rig.model.position.copy(body.position);rig.model.scale.y=body.scale.y;rig.model.rotation.y=angle;rig.legs.forEach((leg,i)=>leg.rotation.x=moving&&!paused&&!reduced?Math.sin(phase+i*Math.PI)*.45:0);};
  animate(this.child,player,(player.userData.walkDistance||0)*7,active<0&&player.userData.walking&&player.userData.grounded,this.face);
  if(!started)this.child.model.position.set(4,.06,2);
  animate(this.enemy,warden,(warden.userData.walkDistance||0)*5,started,warden.position.x<px?-Math.PI/2:Math.PI/2);this.enemy.model.visible=started;
  for(let i=0;i<3;i++){const done=state.clues[level][i];this.gates[level][i].position.y=done?3:0;this.markers[level][i].material.color.set(done?0x7ee6a5:0xffc568);this.markers[level][i].material.emissive.set(done?0x30a060:0xffa640);}
  this.doors[level].rotation.y=-Math.min(1,doorTime/.95)*Math.PI*.55;this.keys[level].visible=!state.keys[level];this.keys[level].rotation.y=reduced?0:time;
  this.renderer.render(this.scene,this.camera);this.canvas.dataset.renderer='webgl-3d';this.canvas.dataset.drawCalls=this.renderer.info.render.calls;
 }
}
