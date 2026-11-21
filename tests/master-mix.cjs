const fs=require('fs'),vm=require('vm'),assert=require('assert');const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/master-mix.js','utf8'),ctx);
for(let a=0;a<=100;a+=5)for(let b=0;b<=100;b+=5)for(let p=100;p<=150;p+=5){const m=ctx.calculateMasterMix([a,b],p);assert(m.volumes.every(v=>v>=0&&v<=1));assert((m.volumes[0]+m.volumes[1])*.85<=.98000001);if(a&&b)assert(Math.abs(m.volumes[0]/m.volumes[1]-a/b)<1e-10)}
for(const pair of [[70,40],[90,20],[30,70]]){const normal=ctx.calculateMasterMix(pair,100),boost=ctx.calculateMasterMix(pair,150);assert(!boost.limited);assert(Math.abs(boost.volumes[0]/normal.volumes[0]-1.5)<1e-10)}
assert(ctx.calculateMasterMix([100,100],150).limited);
console.log('Passed 4851 mixes: unchanged balance, bounded native volume, worst-case summed peak <=0.98; all presets support full 150% boost.');
