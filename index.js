const express = require('express');
const axios   = require('axios');
const crypto  = require('crypto');
const fs      = require('fs');

const app  = express();
const usr  = JSON.parse(fs.readFileSync('./list.json','utf8'));

const sleep   = ms => new Promise(r => setTimeout(r, ms));
const randInt = (min,max)=> Math.floor(Math.random()*(max-min+1))+min;
const pick    = arr=> arr[randInt(0,arr.length-1)];

function freshId(){
  return {
    deviceId: crypto.randomUUID(),
    ua: pick(usr)
  };
}

async function submit(username, msg, id){
  const body = new URLSearchParams({
    username,
    question: msg,
    deviceId: id.deviceId,
    gameSlug: '',
    referrer: '',
    ts: Date.now()
  });

  return axios.post('https://ngl.link/api/submit', body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': id.ua,
      'Origin': 'https://ngl.link',
      'Referer': `https://ngl.link/${username}`
    },
    timeout: 8000
  });
}

app.get('/spam', async (req,res)=>{
  const {url, message, count=10} = req.query;
  if(!url||!message) return res.status(400).json({error:'url & message needed'});

  let uname;
  try{
    uname = new URL(url).pathname.split('/').filter(Boolean).pop();
    if(!uname) throw 0;
  }catch{ return res.status(400).json({error:'bad url'}); }

  const max = Math.min(parseInt(count)||10, 1000);
  const out = {ok:0, fail:0};
  const maxRetry = 3;
  const baseDelay = 600;

  for(let i=1;i<=max;i++){
    let ok = false;
    let tryCount = 0;

    while(!ok && tryCount < maxRetry){
      const id = freshId();
      try{
        await submit(uname, message, id);
        ok = true; out.ok++;
      }catch{
        tryCount++;
        if(tryCount >= maxRetry) out.fail++;
        else await sleep(randInt(400,800)*tryCount);
      }
    }

    if(i<max) await sleep(randInt(baseDelay*0.5, baseDelay*1.5));
  }

  res.json({uname, message, sent:max, ...out});
});

app.get("/", (req, res) => {
  res.json({ message: "ngga ada html jir😂" });
});

module.exports = app;
