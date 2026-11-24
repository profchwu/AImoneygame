// A patrol has a committed heading. Small target changes never reverse it.
export const PATROL_SPEED=.85, CHASE_SPEED=1.55;
export function steerPatrol(memory,x,target,dt){
 memory.facing??=1;memory.turnTime??=0;
 const offset=target-x;
 if(Math.abs(offset)<.5){memory.turnTime=0;return 0;}
 const desired=Math.sign(offset);
 if(desired===memory.facing){memory.turnTime=0;return desired;}
 // Stop and consider a turn; jitter inside the arrival band cancels it.
 memory.turnTime+=dt;
 if(memory.turnTime<.65)return 0;
 memory.facing=desired;memory.turnTime=0;return desired;
}
