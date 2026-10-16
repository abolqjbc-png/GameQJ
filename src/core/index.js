// Minimal offline JSX-only subset of TypeScript's transpileModule API.
// Project sources use plain JavaScript + standard React JSX (no TS syntax).
function transformJSX(src) {
  let i=0;
  const isNameStart=c=>/[A-Za-z_$]/.test(c||'');
  const isName=c=>/[\w$.:\-]/.test(c||'');
  const skipSpace=()=>{while(/\s/.test(src[i]||''))i++;};
  function readBrace() {
    if(src[i]!=='{') throw Error('Expected {');
    const start=++i; let depth=1, quote='', esc=false, line=false, block=false;
    while(i<src.length){let c=src[i],n=src[i+1];
      if(line){if(c==='\n')line=false;i++;continue;}
      if(block){if(c==='*'&&n==='/'){block=false;i+=2;}else i++;continue;}
      if(quote){if(esc){esc=false;i++;continue;} if(c==='\\'){esc=true;i++;continue;} if(c===quote){quote='';i++;continue;} i++;continue;}
      if(c==='/'&&n==='/'){line=true;i+=2;continue;} if(c==='/'&&n==='*'){block=true;i+=2;continue;}
      if(c==='"'||c==="'"||c==='`'){quote=c;i++;continue;}
      if(c==='{')depth++; else if(c==='}'&&!--depth){let body=src.slice(start,i);i++;return body;} i++;
    }
    throw Error('Unclosed JSX expression');
  }
  function readTagName(){let s=i;while(isName(src[i]))i++;if(i===s)throw Error('Invalid JSX tag');return src.slice(s,i);}
  function typeExpr(tag){
    if(!tag)return 'React.Fragment';
    if(tag.includes(':'))return JSON.stringify(tag);
    let first=tag.split('.')[0];
    return /^[a-z]/.test(first)?JSON.stringify(tag):tag;
  }
  function parseElement(){
    if(src[i]!=='<')throw Error('Expected <'); i++;
    if(src[i]==='>'){i++;return parseChildren('',true);}
    const tag=readTagName(); let attrs=[], spreads=[];
    while(i<src.length){skipSpace();
      if(src.startsWith('/>',i)){i+=2;return make(tag,attrs,spreads,[]);}
      if(src[i]==='>'){i++;const kids=parseChildren(tag,false);return make(tag,attrs,spreads,kids);}
      if(src[i]==='{') {let raw=readBrace().trim();if(!raw.startsWith('...'))throw Error('Unexpected JSX attribute expression');spreads.push(transformJSX(raw.slice(3)));continue;}
      let start=i;while(i<src.length&&!/[\s=/>]/.test(src[i]))i++;if(i===start)throw Error('Invalid JSX attribute');
      let key=src.slice(start,i);skipSpace();let val='true';
      if(src[i]==='='){i++;skipSpace();
        if(src[i]==='"'||src[i]==="'"){let q=src[i++],s=i;while(i<src.length&&src[i]!==q){if(src[i]==='\\')i++;i++;}val=JSON.stringify(src.slice(s,i));i++;}
        else if(src[i]==='{'){val=transformJSX(readBrace().trim());}
        else if(src[i]==='<'){val=parseElement();}
        else throw Error('Invalid JSX attribute value');
      }
      let prop=/^[A-Za-z_$][\w$]*$/.test(key)?key:JSON.stringify(key);
      attrs.push(prop+': '+val);
    }
    throw Error('Unclosed JSX start tag');
  }
  function make(tag,attrs,spreads,kids){
    let props='null';
    if(attrs.length||spreads.length){let obj='{'+attrs.join(', ')+'}';props=spreads.length?'Object.assign({}, '+[...spreads,obj].join(', ')+')':obj;}
    let args=[typeExpr(tag),props,...kids];return 'React.createElement('+args.join(', ')+')';
  }
  function parseChildren(tag,fragment){
    let kids=[],text='';
    function flush(){let normalized=text.replace(/[\t\r\n ]+/g,' ').replace(/^ | $/g,'');if(normalized)kids.push(JSON.stringify(normalized));text='';}
    while(i<src.length){
      if(src.startsWith('</',i)){flush();i+=2;if(fragment){if(src[i++]!=='>')throw Error('Bad fragment close');return kids;}let close=readTagName();skipSpace();if(src[i++]!=='>'||close!==tag)throw Error('Mismatched JSX close '+close+' / '+tag);return kids;}
      if(src.startsWith('<!--',i)){let e=src.indexOf('-->',i+4);if(e<0)throw Error('Unclosed JSX comment');i=e+3;continue;}
      if(src[i]==='<'){flush();kids.push(parseElement());continue;}
      if(src[i]==='{'){flush();let raw=readBrace().trim();if(raw&&!/^\/\*[\s\S]*\*\/$/.test(raw))kids.push('('+transformJSX(raw)+')');continue;}
      text+=src[i++];
    }
    throw Error('Unclosed JSX children '+tag);
  }
  function jsxExprPos(pos){
    let j=pos-1; while(j>=0&&/\s/.test(src[j]))j--;
    if(j<0)return true;
    let c=src[j];
    if('(:,?=[{!;'.includes(c))return true;
    if(c==='>'&&j>0&&src[j-1]==='=')return true;
    if((c==='&'&&j>0&&src[j-1]==='&')||(c==='|'&&j>0&&src[j-1]==='|'))return true;
    let end=j+1; while(j>=0&&/[A-Za-z_$]/.test(src[j]))j--;
    return src.slice(j+1,end)==='return';
  }
  let out='';
  while(i<src.length){
    if(src[i]==='<'){let next=src[i+1];if((isNameStart(next)||next==='>')&&jsxExprPos(i)){
      let save=i;try{out+=parseElement();continue;}catch(e){i=save;}
    }}
    if(src[i]==='{') { // transform JSX nested in ordinary JS expression
      try{let raw=readBrace();out+='{'+transformJSX(raw)+'}';continue;}catch(e){i++;out+='{';continue;}
    }
    out+=src[i++];
  }
  return out;
}
exports.JsxEmit={React:2}; exports.ScriptTarget={ES2020:7}; exports.ModuleKind={};
exports.transpileModule=function(source,options){return {outputText:transformJSX(source),diagnostics:[]};};
