// src/utils/math.js
/*  This is for the math functions i will be using I am creating it myself to learn and to know how math actually 
work in game development and not importing a library that does the work for me beacuse I am just "LEARNING" */

//This function will just clmaps the number ( It is in the name bro cmon )
export function clamp(value, min, max){
    if(value < min){
        return min
    }
    else if(value > max){
        return max;
    }
    else{
        return value;
    }
}

// This is function does linear interplation which is just c = a + (b - a) * t 
// for short it lets us move from point (A) to point (B) in a time (t) where 0 <= t <= 1 
export function lerp(a,b,t){
    const result = a + (b - a) * t;
    return result
}