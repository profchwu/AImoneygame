import * as T from 'three';
import {mergeGeometries} from './BufferGeometryUtils.js';
import {GLTFLoader} from './GLTFLoader.js';
import {roomObstacles,stations,EXIT,LENGTH,ALTAR} from './world.js?v=5';

// One world, one camera and one depth buffer: props, characters and shadows
// all occupy the same coordinates as the collision simulation.
export class CinematicStage{
 constructor(canvas){
  this.canvas=canvas;this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.35;
  this.scene=new T.Scene();this.scene.background=new T.Color('#101b25');this.scene.fog=new T.Fog('#101b25',20,48);
  this.camera=new T.PerspectiveCamera(43,1,.1,80);this.lastX=1;this.face=-Math.PI/2;
  this.materials={};this.rooms=[];this.doors=[];this.gates=[];this.markers=[];this.keys=[];
  this.scene.add(new T.HemisphereLight(0x9bb5cc,0x28201c,.8));
  this.moon=new T.DirectionalLight(0x8eb9eb,1.2);this.moon.position.set(9,9,-4);this.scene.add(this.moon);
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
 wovenRug(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const c=canvas.getContext('2d');c.fillStyle='#392321';c.fillRect(0,0,1024,512);
  for(const [inset,color,width] of [[12,'#9a805a',5],[25,'#203e40',15],[40,'#af9062',3],[58,'#796448',2]]){c.strokeStyle=color;c.lineWidth=width;c.strokeRect(inset,inset,1024-2*inset,512-2*inset);}
  const flower=(x,y,r)=>{c.save();c.translate(x,y);for(let i=0;i<8;i++){c.rotate(Math.PI/4);c.fillStyle=i%2?'#82734f':'#40615c';c.beginPath();c.ellipse(r*.45,0,r*.5,r*.16,0,0,7);c.fill();}c.fillStyle='#b2996c';c.beginPath();c.arc(0,0,r*.17,0,7);c.fill();c.restore();};
  for(let x=85;x<960;x+=80)for(let y=88;y<440;y+=65)flower(x+(Math.floor(y/65)%2)*25,y,22);
  for(let x=30;x<1000;x+=26){flower(x,26,9);flower(x,486,9);}for(let y=54;y<480;y+=26){flower(26,y,9);flower(998,y,9);}
  for(let i=0;i<512;i++){c.fillStyle=i%2?'#dfc58c0b':'#0808071c';c.fillRect(0,i,1024,1);}const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(4,4);return map;
 }
 box(parent,x,y,z,w,h,d,mat){
  let geometry;
  if(Math.min(w,h,d)>.09&&Math.max(w,h,d)<3.5){
   const bevel=Math.min(.025,Math.min(w,h,d)*.12),shape=new T.Shape();shape.moveTo(-w/2+bevel,-h/2+bevel);shape.lineTo(w/2-bevel,-h/2+bevel);shape.lineTo(w/2-bevel,h/2-bevel);shape.lineTo(-w/2+bevel,h/2-bevel);shape.closePath();
   geometry=new T.ExtrudeGeometry(shape,{depth:d-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1});geometry.translate(0,0,-d/2+bevel);
  }else geometry=new T.BoxGeometry(w,h,d);
  const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
 }
 sphere(parent,x,y,z,r,mat,scale=[1,1,1]){const m=new T.Mesh(new T.SphereGeometry(r,16,12),mat);m.position.set(x,y,z);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 rod(parent,a,b,r,mat){const va=new T.Vector3(...a),vb=new T.Vector3(...b),m=new T.Mesh(new T.CylinderGeometry(r,r,va.distanceTo(vb),10),mat);m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vb.sub(va).normalize());m.castShadow=true;parent.add(m);return m;}
 label(parent,text,x,y,z){const cv=document.createElement('canvas');cv.width=512;cv.height=96;const c=cv.getContext('2d');c.fillStyle='#132128ee';c.fillRect(0,0,512,96);c.strokeStyle='#bca478';c.strokeRect(3,3,506,90);c.fillStyle='#f4e2bb';c.font='28px Microsoft JhengHei';c.textAlign='center';c.fillText(text,256,60);const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(2.0,.375),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 makeRoom(level){
  const room=new T.Group();this.scene.add(room);this.rooms.push(room);this.gates[level]=[];this.markers[level]=[];
  const oak=this.material('oak','#65503a'),dark=this.material('trim','#302d27'),iron=this.material('iron','#253b41','plaster',.65),brass=this.material('brass','#9c773a','wood',.7),plaster=this.material('plaster','#45565b','plaster'),green=this.material('leaves','#385b3b','plaster'),clay=this.material('clay','#784934','plaster');
  this.box(room,17,-.13,1,36,.3,9,dark);
  room.add(this.detailedRooms[level]);
  const floor=this.box(room,17,.035,1.4,40,.045,9,this.materials.floor);
  const floorUV=floor.geometry.attributes.uv;for(let i=0;i<floorUV.count;i++){floorUV.setXY(i,floorUV.getX(i)*10,floorUV.getY(i)*2.25);}floorUV.needsUpdate=true;
  // Warm pools from standing brass lamps; cool window fill preserves depth.
  for(const x of [3.2,11.2,19.2,27.2]){
   const light=new T.PointLight(0xffbb70,16,7,2);light.position.set(x,2.0,.5);room.add(light);
   const wallLight=new T.SpotLight(0xffbc75,40,9,.78,.65,1.4);wallLight.position.set(x,2,.5);wallLight.target.position.set(x+2.0,2.4,-2.35);room.add(wallLight,wallLight.target);
   const beam=new T.Mesh(new T.ConeGeometry(1.2,3.6,24,1,true),new T.MeshBasicMaterial({color:0xffce8d,transparent:true,opacity:.035,depthWrite:false,side:T.DoubleSide}));beam.position.set(x+1,1.5,-.6);beam.rotation.z=Math.PI/2;room.add(beam);
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
  const groups=new Map();room.updateMatrixWorld(true);for(const child of [...room.children]){if(child.isMesh&&child.geometry.type!=='PlaneGeometry'&&!this.markers[level].includes(child)){let geometry=child.geometry.clone().applyMatrix4(child.matrix);if(geometry.index)geometry=geometry.toNonIndexed();const list=groups.get(child.material)||[];list.push(geometry);groups.set(child.material,list);room.remove(child);}}
  for(const [material,geometries] of groups){const mesh=new T.Mesh(mergeGeometries(geometries),material);mesh.castShadow=mesh.receiveShadow=true;room.add(mesh);for(const geometry of geometries)geometry.dispose();}
  this.box(room,ALTAR,.45,.1,1.4,.8,.7,dark);this.box(room,ALTAR,.87,.1,1.5,.08,.8,brass);
  const key=new T.Group();key.position.set(ALTAR,1.5,.1);const ring=new T.Mesh(new T.TorusGeometry(.13,.035,8,20),brass);key.add(ring);this.box(key,0,-.24,0,.055,.3,.06,brass);this.box(key,.06,-.33,0,.15,.05,.06,brass);room.add(key);this.keys[level]=key;this.label(room,'KEY 寶箱 · E',ALTAR,2,.1);
  const door=new T.Group();door.position.set(EXIT-.7,.06,.1);room.add(door);this.box(door,.7,1.4,0,1.4,2.8,.15,oak);for(const y of [.65,2])this.box(door,.7,y,.1,1.1,.9,.07,dark);this.sphere(door,1.2,1.2,.19,.07,brass);this.doors[level]=door;
  for(const x of [EXIT-.85,EXIT+.85])this.box(room,x,1.5,.1,.15,3.0,.4,dark);this.box(room,EXIT,3,.1,1.85,.15,.4,dark);this.label(room,level?'回家的門 · E':'月光溫室 · E',EXIT,3.4,.1);
 }
 async load(progress){
  const loader=new GLTFLoader();
  const rugMap=this.wovenRug();
  this.detailedRooms=await Promise.all([0,1].map(async level=>{const gltf=await loader.loadAsync(new URL(`./reference-room-${level}.glb?v=8`,import.meta.url).href);gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of (Array.isArray(o.material)?o.material:[o.material])){
   if(/Honey oak/.test(m.name))m.color.set(0x75817f);
   if(/Walnut/.test(m.name))m.color.set(0x56635f);
   if(/Dusty rose|Sage|Ivory linen|Knitted teal|Rust corduroy|Paper/.test(m.name))m.color.multiplyScalar(.65);
   if(/Woven lavender/.test(m.name)){m.map=rugMap;m.color.set(0xffffff);m.roughness=1;}
   if(/Lamp lens/.test(m.name)){m.emissive.set(0xffb95b);m.emissiveIntensity=2;}
  }}});return gltf.scene;}));
  const textures=new T.TextureLoader();
  for(const [name,asset,color] of [['oak','wood_cabinet_worn_long',0xa99780],['trim','wood_cabinet_worn_long',0x504339],['floor','old_wood_floor',0x93806a]]){
   const maps=await Promise.all(['diff','normal','rough'].map(async channel=>{const map=await textures.loadAsync(new URL(`./${asset}-${channel}.jpg`,import.meta.url).href);map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;if(channel==='diff')map.colorSpace=T.SRGBColorSpace;return map;}));
   this.materials[name]=new T.MeshStandardMaterial({color,map:maps[0],normalMap:maps[1],normalScale:new T.Vector2(.65,.65),roughnessMap:maps[2],roughness:.85});
  }
  this.makeRoom(0);this.makeRoom(1);
  // Preserve the approved knitted-cloak character, in the world's depth buffer.
  // Cutout alpha (not blending) keeps boots opaque behind glass and in fog.
  const atlas=await new T.TextureLoader().loadAsync(new URL('./child-walk.png?v=6',import.meta.url).href);
  atlas.colorSpace=T.SRGBColorSpace;atlas.magFilter=T.LinearFilter;atlas.minFilter=T.LinearFilter;atlas.generateMipmaps=false;
  const material=new T.MeshBasicMaterial({map:atlas,alphaTest:.5,alphaToCoverage:true,side:T.DoubleSide,toneMapped:false,color:0xe4e8e9});
  const model=new T.Group(),portrait=new T.Mesh(new T.PlaneGeometry(1,1),material);model.add(portrait);portrait.castShadow=true;
  portrait.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:atlas,alphaTest:.5,side:T.DoubleSide});
  const idle=await new T.TextureLoader().loadAsync(new URL('./child-cinematic.png?v=6',import.meta.url).href);idle.colorSpace=T.SRGBColorSpace;
  this.child={model,portrait,atlas,idle};this.scene.add(model);
  const cv=document.createElement('canvas');cv.width=cv.height=64;const context=cv.getContext('2d'),gradient=context.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(0,0,0,.48)');gradient.addColorStop(1,'rgba(0,0,0,0)');context.fillStyle=gradient;context.fillRect(0,0,64,64);
  this.contact=new T.Mesh(new T.PlaneGeometry(.85,.48),new T.MeshBasicMaterial({map:new T.CanvasTexture(cv),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));this.contact.rotation.x=-Math.PI/2;this.scene.add(this.contact);progress(1);
  const enemyAtlas=await new T.TextureLoader().loadAsync(new URL('./warden-walk.png?v=7',import.meta.url).href);enemyAtlas.colorSpace=T.SRGBColorSpace;enemyAtlas.minFilter=T.LinearFilter;enemyAtlas.generateMipmaps=false;
  const enemyMaterial=material.clone();enemyMaterial.map=enemyAtlas;
  const enemyModel=new T.Group(),enemyPortrait=new T.Mesh(new T.PlaneGeometry(1,1),enemyMaterial);enemyPortrait.castShadow=true;enemyPortrait.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:enemyAtlas,alphaTest:.5,side:T.DoubleSide});enemyModel.add(enemyPortrait);this.scene.add(enemyModel);this.enemy={model:enemyModel,portrait:enemyPortrait};
  this.enemyContact=this.contact.clone();this.enemyContact.material=this.contact.material.clone();this.enemyContact.scale.set(1.4,1.4,1);this.scene.add(this.enemyContact);progress(2);this.resize();
 }
 floorPoint(x,y){const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(x/innerWidth*2-1,-y/innerHeight*2+1),this.camera);const point=new T.Vector3();if(!ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.06),point))return null;point.x=T.MathUtils.clamp(point.x,.5,LENGTH);point.z=T.MathUtils.clamp(point.z,.9,3.1);return point;}
 resize(){this.renderer.setSize(innerWidth,innerHeight,false);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
 draw({player,warden,state,time,active,started,paused,reduced,doorTime=0}){
  const level=state.stage||0;this.rooms.forEach((r,i)=>r.visible=i===level);
  const px=started?player.position.x:4,cx=Math.max(2.8,Math.min(29,px+1.9));
  // A shared side-on camera, with only a shallow downward pitch for lane depth.
  // Never rotate individual portraits toward the camera: that twists their feet
  // away from the world's walking axis and gives each actor a different view.
  this.camera.position.set(cx,2.8,11.4);this.camera.lookAt(cx,1.55,1.15);
  this.keyLight.position.set(px-2,5.7,4);this.keyLight.target.position.set(px+1,0,1.6);this.rim.position.set(px+2,3,-1);
  const delta=player.position.x-this.lastX;if(Math.abs(delta)>.001)this.face=delta>0?-Math.PI/2:Math.PI/2;this.lastX=player.position.x;
  const walking=started&&!paused&&!reduced&&active<0&&player.userData.walking&&player.userData.grounded;
  const frame=walking?Math.floor((player.userData.walkDistance||0)*5)%6:1;
  const edges=[0,400,722,1074,1492,1805,2172],anchors=[180,545,903,1268,1630,1985];
  const left=edges[frame],right=edges[frame+1],height=1.86,scale=height/674,direction=this.face<0?1:-1;
  const portrait=this.child.portrait;portrait.scale.set((right-left)*scale,height,1);portrait.position.set(((left+right)/2-anchors[frame])*scale*direction,height/2,0);
  const uv=portrait.geometry.attributes.uv,u0=(direction>0?left:right)/2172,u1=(direction>0?right:left)/2172;
  uv.setXY(0,u0,1-22/724);uv.setXY(1,u1,1-22/724);uv.setXY(2,u0,1-696/724);uv.setXY(3,u1,1-696/724);uv.needsUpdate=true;
  const map=walking?this.child.atlas:this.child.idle;portrait.material.map=map;portrait.customDepthMaterial.map=map;
  if(!walking){portrait.scale.set(height*this.child.idle.image.width/this.child.idle.image.height,height,1);portrait.position.x=0;uv.setXY(0,direction>0?0:1,1);uv.setXY(1,direction>0?1:0,1);uv.setXY(2,direction>0?0:1,0);uv.setXY(3,direction>0?1:0,0);}
  this.child.model.position.copy(player.position);this.child.model.scale.y=player.scale.y;
  if(!started)this.child.model.position.set(4,.06,2);
  this.child.model.rotation.y=0;
  this.contact.position.set(this.child.model.position.x,.067,this.child.model.position.z);this.contact.material.opacity=Math.max(.12,1-Math.max(0,player.position.y-.06)*.65);
  this.canvas.dataset.character='original-knit-cloak';this.canvas.dataset.walkFrame=walking?String(frame):'idle';this.canvas.dataset.facing=direction>0?'right':'left';
  const enemyDirection=warden.userData.facing||1;
  const enemyFrame=reduced?1:Math.floor((warden.userData.walkDistance||0)*2.8)%6;
  const ew=2172/6,eh=608,enemyHeight=2.85,es=enemyHeight/eh,ep=this.enemy.portrait;
  ep.scale.set(ew*es,enemyHeight,1);ep.position.set(0,enemyHeight/2,0);
  // The source patrol sheet faces LEFT; the hero sheet faces RIGHT.
  const a=enemyFrame/6,b=(enemyFrame+1)/6,euv=ep.geometry.attributes.uv;
  const eu0=enemyDirection>0?b:a,eu1=enemyDirection>0?a:b;
  euv.setXY(0,eu0,1-74/724);euv.setXY(1,eu1,1-74/724);euv.setXY(2,eu0,1-682/724);euv.setXY(3,eu1,1-682/724);euv.needsUpdate=true;
  this.enemy.model.position.copy(warden.position);this.enemy.model.rotation.y=0;this.enemy.model.visible=started;
  this.enemyContact.position.set(warden.position.x,.068,warden.position.z);this.enemyContact.visible=started;
  this.canvas.dataset.warden='original-long-dress';this.canvas.dataset.wardenFacing=enemyDirection>0?'right':'left';this.canvas.dataset.wardenFrame=String(enemyFrame);this.canvas.dataset.view='shared-side-view';
  for(let i=0;i<3;i++){const done=state.clues[level][i];this.gates[level][i].position.y=done?3:0;this.markers[level][i].material.color.set(done?0x7ee6a5:0xffc568);this.markers[level][i].material.emissive.set(done?0x30a060:0xffa640);}
  this.doors[level].rotation.y=-Math.min(1,doorTime/.95)*Math.PI*.55;this.keys[level].visible=!state.keys[level];this.keys[level].rotation.y=reduced?0:time;
  this.renderer.render(this.scene,this.camera);this.canvas.dataset.renderer='webgl-3d';this.canvas.dataset.drawCalls=this.renderer.info.render.calls;
 }
}
