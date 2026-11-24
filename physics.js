export const FLOOR=.06;
export const obstacles=[
 {id:'cart1',x0:-.05,x1:2.6,z0:.9,z1:1.95,height:1.05,kind:'cart'},
 {id:'crate1',x0:3.45,x1:3.95,z0:2.25,z1:3.1,height:.42,kind:'crate'},
 {id:'cart2',x0:10.15,x1:14.6,z0:.9,z1:1.95,height:1.05,kind:'cart'},
 {id:'crate2',x0:14.1,x1:14.85,z0:2.25,z1:3.1,height:.42,kind:'crate'}
];
const radius=.18,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function overlaps(x,z,o){return x>o.x0-radius&&x<o.x1+radius&&z>o.z0-radius&&z<o.z1+radius;}
export function groundAt(p,solids=obstacles){let y=FLOOR;for(const o of solids)if(overlaps(p.x,p.z,o)&&p.y>=o.height+FLOOR-.015)y=Math.max(y,o.height+FLOOR);return y;}
export function stepBody(p,velocity,dx,dz,dt,{jump=false,speed=3.8,solids=obstacles,bounds=[-3,19]}={}){
 let grounded=Math.abs(p.y-groundAt(p,solids))<.02;
 if(jump&&grounded)velocity.y=5.2;
 const length=Math.hypot(dx,dz)||1;let blocked=false;const startX=p.x,startZ=p.z;
 const n=Math.max(1,Math.ceil(dt/.008));
 for(let i=0;i<n;i++){
  const t=dt/n;velocity.y-=15*t;
  const oldY=p.y;p.y+=velocity.y*t;
  // Land on the top surface, not through it.
  let support=FLOOR;
  for(const o of solids)if(overlaps(p.x,p.z,o)&&oldY>=o.height+FLOOR-.015&&p.y<=o.height+FLOOR)support=Math.max(support,o.height+FLOOR);
  if(p.y<=support){p.y=support;velocity.y=0;}
  for(const axis of ['x','z']){
   const previous=p[axis];p[axis]+= (axis==='x'?dx:dz)/length*speed*t;
   p.x=clamp(p.x,...bounds);p.z=clamp(p.z,.9,3.1);
   for(const o of solids)if(p.y<o.height+FLOOR-.01&&overlaps(p.x,p.z,o)){p[axis]=previous;blocked=true;break;}
  }
 }
 grounded=Math.abs(p.y-groundAt(p,solids))<.02;
 return {blocked,grounded,distance:Math.hypot(p.x-startX,p.z-startZ)};
}
