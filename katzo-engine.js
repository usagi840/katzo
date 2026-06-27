/* =========================================================================
   KATZO ENGINE — moteur du langage de programmation Katzo (en français)
   Usage façon Phaser :

     <script src="katzo-engine.js"></script>
     <script type="text/katzo" id="monJeu">
        ... ton code Katzo ...
     </script>
     <script>
        Katzo.run('monJeu', { canvas: 'scene' });
     </script>

   API publique : Katzo.run(codeOuIdDeBalise, options)
     options.canvas      : id du <canvas> à utiliser (def: 'katzo-canvas')
     options.onLog        : fonction(texte, type) appelée pour affiche/erreurs
                            type vaut 'print' | 'error' | 'ok' | 'info'
     options.onStatusChange: fonction(statut) statut vaut 'running'|'stopped'
   Retourne un objet { stop() } permettant d'arrêter le jeu manuellement.
   ========================================================================= */
(function(global){
"use strict";

/* ============== 1. LEXER ============== */
const TOKEN_TYPES = {
  NUMBER:'NUMBER', STRING:'STRING', IDENT:'IDENT', KEYWORD:'KEYWORD',
  OP:'OP', LPAREN:'LPAREN', RPAREN:'RPAREN', LBRACE:'LBRACE', RBRACE:'RBRACE',
  COMMA:'COMMA', DOT:'DOT', NEWLINE:'NEWLINE', EOF:'EOF'
};

const KEYWORDS = new Set([
  'variable','si','sinon','sinonsi','répète','repete','tantque','pour','de','a','à',
  'fonction','retourne','affiche','dessine','cercle','rectangle','texte','ligne',
  'déplace','deplace','efface','attends','vrai','faux','et','ou','non','rien',
  'casse','arrete','arrête','continue',
  'quand','demarre','démarre','chaqueFrame',
  'detruit','détruit','arretejeu','arrêtejeu'
  // touche, toucheAppuyee, collision, creerSprite, etc. sont des fonctions
  // natives normales (identifiants), pas des mots-clés, pour pouvoir s'écrire
  // en position d'expression : si touche("gauche") { ... }
]);

function lexer(src){
  const tokens = [];
  let i=0, line=1;
  const n = src.length;
  function peek(o=0){ return src[i+o]; }

  while(i<n){
    let c = src[i];

    if(c==='/' && peek(1)==='/'){
      while(i<n && src[i]!=='\n') i++;
      continue;
    }
    if(c==='\n'){
      tokens.push({type:TOKEN_TYPES.NEWLINE, line});
      line++; i++; continue;
    }
    if(c===' '||c==='\t'||c==='\r'){ i++; continue; }

    if(c==='"' || c==="'"){
      const quote=c; let str=''; i++;
      while(i<n && src[i]!==quote){
        if(src[i]==='\\' && i+1<n){ str+=src[i+1]; i+=2; continue; }
        str+=src[i]; i++;
      }
      i++;
      tokens.push({type:TOKEN_TYPES.STRING, value:str, line});
      continue;
    }

    if(/[0-9]/.test(c)){
      let num='';
      while(i<n && /[0-9.]/.test(src[i])){ num+=src[i]; i++; }
      tokens.push({type:TOKEN_TYPES.NUMBER, value:parseFloat(num), line});
      continue;
    }

    if(/[a-zA-ZÀ-ÿ_]/.test(c)){
      let id='';
      while(i<n && /[a-zA-ZÀ-ÿ0-9_]/.test(src[i])){ id+=src[i]; i++; }
      const low = id.toLowerCase();
      if(low==='vrai'||low==='faux'){
        tokens.push({type:TOKEN_TYPES.KEYWORD, value:low, line});
      } else if(KEYWORDS.has(id) || KEYWORDS.has(low)){
        const kw = KEYWORDS.has(id) ? id : low;
        tokens.push({type:TOKEN_TYPES.KEYWORD, value:kw, line});
      } else {
        tokens.push({type:TOKEN_TYPES.IDENT, value:id, line});
      }
      continue;
    }

    const two = src.substr(i,2);
    if(['==','!=','>=','<=','&&','||','+=','-=','*=','/='].includes(two)){
      tokens.push({type:TOKEN_TYPES.OP, value:two, line});
      i+=2; continue;
    }

    if(c==='('){ tokens.push({type:TOKEN_TYPES.LPAREN, line}); i++; continue; }
    if(c===')'){ tokens.push({type:TOKEN_TYPES.RPAREN, line}); i++; continue; }
    if(c==='{'){ tokens.push({type:TOKEN_TYPES.LBRACE, line}); i++; continue; }
    if(c==='}'){ tokens.push({type:TOKEN_TYPES.RBRACE, line}); i++; continue; }
    if(c===','){ tokens.push({type:TOKEN_TYPES.COMMA, line}); i++; continue; }
    if(c==='.'){ tokens.push({type:TOKEN_TYPES.DOT, line}); i++; continue; }
    if(c===';'){ tokens.push({type:TOKEN_TYPES.NEWLINE, line}); i++; continue; }

    if('+-*/%<>=!'.includes(c)){
      tokens.push({type:TOKEN_TYPES.OP, value:c, line});
      i++; continue;
    }
    i++;
  }
  tokens.push({type:TOKEN_TYPES.EOF, line});
  return tokens;
}

/* ============== ERREURS / SIGNAUX ============== */
class KatzoError extends Error{
  constructor(msg, line){ super(msg); this.line = line; }
}
class BreakSignal extends Error{}
class ContinueSignal extends Error{}
class ReturnSignal extends Error{ constructor(value){ super(); this.value=value; } }

/* ============== 2. PARSER ============== */
function FixedParser(tokens){
  let pos=0;
  function cur(){ return tokens[pos]; }
  function at(type, value){
    const t=cur();
    if(t.type!==type) return false;
    if(value!==undefined && t.value!==value) return false;
    return true;
  }
  function eat(type, value){
    if(!at(type,value)){
      const t=cur();
      throw new KatzoError(`attendu ${value||type} mais trouvé '${t.value!==undefined?t.value:t.type}'`, t.line);
    }
    return tokens[pos++];
  }
  function skipNewlines(){ while(at(TOKEN_TYPES.NEWLINE)) pos++; }

  function parseProgram(){
    const body=[]; skipNewlines();
    while(!at(TOKEN_TYPES.EOF)){ body.push(parseStatement()); skipNewlines(); }
    return {type:'Program', body};
  }
  function parseBlock(){
    eat(TOKEN_TYPES.LBRACE); skipNewlines();
    const body=[];
    while(!at(TOKEN_TYPES.RBRACE)){ body.push(parseStatement()); skipNewlines(); }
    eat(TOKEN_TYPES.RBRACE);
    return body;
  }
  function parseStatement(){
    const t=cur();
    if(t.type===TOKEN_TYPES.KEYWORD){
      switch(t.value){
        case 'variable': return parseVarDecl();
        case 'si': return parseIf();
        case 'répète': case 'repete': return parseRepeat();
        case 'tantque': return parseWhile();
        case 'pour': return parseForStmt();
        case 'fonction': return parseFuncDecl();
        case 'quand': return parseWhen();
        case 'retourne': {
          pos++;
          let val=null;
          if(!at(TOKEN_TYPES.NEWLINE) && !at(TOKEN_TYPES.RBRACE) && !at(TOKEN_TYPES.EOF)) val=parseExpr();
          return {type:'Return', value:val};
        }
        case 'affiche': return parseCommand('Print');
        case 'cercle': return parseCommand('Circle');
        case 'rectangle': return parseCommand('Rect');
        case 'texte': return parseCommand('Text');
        case 'ligne': return parseCommand('Line');
        case 'efface': { pos++; return {type:'Clear'}; }
        case 'attends': return parseCommand('Wait');
        case 'detruit': case 'détruit': return parseCommand('Destroy');
        case 'arretejeu': case 'arrêtejeu': { pos++; return {type:'StopGame'}; }
        case 'casse': case 'arrete': case 'arrête': { pos++; return {type:'Break'}; }
        case 'continue': { pos++; return {type:'Continue'}; }
      }
    }
    if(t.type===TOKEN_TYPES.IDENT){
      const save=pos;
      let target = {type:'Identifier', name:eat(TOKEN_TYPES.IDENT).value};
      while(at(TOKEN_TYPES.DOT)){
        pos++;
        const propTok = eat(TOKEN_TYPES.IDENT);
        target = {type:'Member', object:target, property:propTok.value};
      }
      if(at(TOKEN_TYPES.OP,'=')||at(TOKEN_TYPES.OP,'+=')||at(TOKEN_TYPES.OP,'-=')||at(TOKEN_TYPES.OP,'*=')||at(TOKEN_TYPES.OP,'/=')){
        const op=eat(TOKEN_TYPES.OP).value;
        const value=parseExpr();
        if(target.type==='Identifier'){
          return {type:'Assign', name:target.name, op, value};
        } else {
          return {type:'MemberAssign', target, op, value};
        }
      }
      pos=save;
    }
    const expr=parseExpr();
    return {type:'ExprStatement', expr};
  }
  function parseCommand(kind){
    pos++;
    const args=[];
    if(!at(TOKEN_TYPES.NEWLINE) && !at(TOKEN_TYPES.RBRACE) && !at(TOKEN_TYPES.EOF)){
      args.push(parseExpr());
      while(at(TOKEN_TYPES.COMMA)){ pos++; args.push(parseExpr()); }
    }
    return {type:'Command', kind, args};
  }
  function parseVarDecl(){
    pos++;
    const name=eat(TOKEN_TYPES.IDENT).value;
    let value={type:'Literal', value:null};
    if(at(TOKEN_TYPES.OP,'=')){ pos++; value=parseExpr(); }
    return {type:'VarDecl', name, value};
  }
  function parseIf(){
    pos++;
    const test=parseExpr();
    const consequent=parseBlock();
    let alternate=null;
    skipNewlines();
    if(at(TOKEN_TYPES.KEYWORD,'sinonsi')){
      alternate=[parseIf()];
    } else if(at(TOKEN_TYPES.KEYWORD,'sinon')){
      pos++;
      if(at(TOKEN_TYPES.KEYWORD,'si')){ alternate=[parseIf()]; }
      else { alternate=parseBlock(); }
    }
    return {type:'If', test, consequent, alternate};
  }
  function parseRepeat(){
    pos++;
    const count=parseExpr();
    const body=parseBlock();
    return {type:'Repeat', count, body};
  }
  function parseWhile(){
    pos++;
    const test=parseExpr();
    const body=parseBlock();
    return {type:'While', test, body};
  }
  function parseForStmt(){
    pos++;
    const varName=eat(TOKEN_TYPES.IDENT).value;
    eat(TOKEN_TYPES.KEYWORD,'de');
    const from=parseExpr();
    if(at(TOKEN_TYPES.KEYWORD,'a') || at(TOKEN_TYPES.KEYWORD,'à')) pos++;
    else eat(TOKEN_TYPES.KEYWORD,'à');
    const to=parseExpr();
    const body=parseBlock();
    return {type:'For', varName, from, to, body};
  }
  function parseFuncDecl(){
    pos++;
    const name=eat(TOKEN_TYPES.IDENT).value;
    eat(TOKEN_TYPES.LPAREN);
    const params=[];
    if(!at(TOKEN_TYPES.RPAREN)){
      params.push(eat(TOKEN_TYPES.IDENT).value);
      while(at(TOKEN_TYPES.COMMA)){ pos++; params.push(eat(TOKEN_TYPES.IDENT).value); }
    }
    eat(TOKEN_TYPES.RPAREN);
    const body=parseBlock();
    return {type:'FuncDecl', name, params, body};
  }
  function parseWhen(){
    pos++;
    const t = cur();
    let hook;
    if(t.type===TOKEN_TYPES.KEYWORD && (t.value==='demarre'||t.value==='démarre')){ pos++; hook='demarre'; }
    else if(t.type===TOKEN_TYPES.KEYWORD && t.value==='chaqueFrame'){ pos++; hook='chaqueFrame'; }
    else throw new KatzoError(`'quand' doit être suivi de 'demarre' ou 'chaqueFrame'`, t.line);
    const body = parseBlock();
    return {type:'When', hook, body};
  }

  function parseExpr(){ return parseOr(); }
  function parseOr(){
    let left=parseAnd();
    while(at(TOKEN_TYPES.KEYWORD,'ou')||at(TOKEN_TYPES.OP,'||')){ pos++; const right=parseAnd(); left={type:'Logical', op:'ou', left, right}; }
    return left;
  }
  function parseAnd(){
    let left=parseNot();
    while(at(TOKEN_TYPES.KEYWORD,'et')||at(TOKEN_TYPES.OP,'&&')){ pos++; const right=parseNot(); left={type:'Logical', op:'et', left, right}; }
    return left;
  }
  function parseNot(){
    if(at(TOKEN_TYPES.KEYWORD,'non')||at(TOKEN_TYPES.OP,'!')){ pos++; const expr=parseNot(); return {type:'Unary', op:'non', expr}; }
    return parseComparison();
  }
  function parseComparison(){
    let left=parseAdditive();
    while(at(TOKEN_TYPES.OP,'==')||at(TOKEN_TYPES.OP,'!=')||at(TOKEN_TYPES.OP,'>')||at(TOKEN_TYPES.OP,'<')||at(TOKEN_TYPES.OP,'>=')||at(TOKEN_TYPES.OP,'<=')){
      const op=eat(TOKEN_TYPES.OP).value; const right=parseAdditive(); left={type:'Binary', op, left, right};
    }
    return left;
  }
  function parseAdditive(){
    let left=parseMultiplicative();
    while(at(TOKEN_TYPES.OP,'+')||at(TOKEN_TYPES.OP,'-')){
      const op=eat(TOKEN_TYPES.OP).value; const right=parseMultiplicative(); left={type:'Binary', op, left, right};
    }
    return left;
  }
  function parseMultiplicative(){
    let left=parseUnary();
    while(at(TOKEN_TYPES.OP,'*')||at(TOKEN_TYPES.OP,'/')||at(TOKEN_TYPES.OP,'%')){
      const op=eat(TOKEN_TYPES.OP).value; const right=parseUnary(); left={type:'Binary', op, left, right};
    }
    return left;
  }
  function parseUnary(){
    if(at(TOKEN_TYPES.OP,'-')){ pos++; const expr=parseUnary(); return {type:'Unary', op:'-', expr}; }
    return parseCallMemberOrPrimary();
  }
  function parseCallMemberOrPrimary(){
    let expr=parsePrimary();
    while(true){
      if(at(TOKEN_TYPES.LPAREN)){
        pos++;
        const args=[];
        if(!at(TOKEN_TYPES.RPAREN)){
          args.push(parseExpr());
          while(at(TOKEN_TYPES.COMMA)){ pos++; args.push(parseExpr()); }
        }
        eat(TOKEN_TYPES.RPAREN);
        expr={type:'Call', callee:expr, args};
      } else if(at(TOKEN_TYPES.DOT)){
        pos++;
        const propTok = eat(TOKEN_TYPES.IDENT);
        expr={type:'Member', object:expr, property:propTok.value};
      } else {
        break;
      }
    }
    return expr;
  }
  function parsePrimary(){
    const t=cur();
    if(t.type===TOKEN_TYPES.NUMBER){ pos++; return {type:'Literal', value:t.value}; }
    if(t.type===TOKEN_TYPES.STRING){ pos++; return {type:'Literal', value:t.value}; }
    if(t.type===TOKEN_TYPES.KEYWORD && t.value==='vrai'){ pos++; return {type:'Literal', value:true}; }
    if(t.type===TOKEN_TYPES.KEYWORD && t.value==='faux'){ pos++; return {type:'Literal', value:false}; }
    if(t.type===TOKEN_TYPES.KEYWORD && t.value==='rien'){ pos++; return {type:'Literal', value:null}; }
    if(t.type===TOKEN_TYPES.IDENT){ pos++; return {type:'Identifier', name:t.value}; }
    if(t.type===TOKEN_TYPES.LPAREN){ pos++; const e=parseExpr(); eat(TOKEN_TYPES.RPAREN); return e; }
    throw new KatzoError(`expression inattendue : '${t.value!==undefined?t.value:t.type}'`, t.line);
  }
  return parseProgram();
}

/* ============== 3. RUNTIME OBJECTS ============== */
class KatzoSprite{
  constructor(id, x, y, w, h, couleur, forme){
    this.__katzoSprite = true;
    this.id = id;
    this.x = x; this.y = y;
    this.largeur = w; this.hauteur = h;
    this.couleur = couleur || '#ff6b3d';
    this.forme = forme || 'rectangle';
    this.vx = 0; this.vy = 0;
    this.detruit = false;
    this.texte = '';
  }
}

class Scope{
  constructor(parent=null){ this.vars=new Map(); this.parent=parent; }
  get(name){
    if(this.vars.has(name)) return this.vars.get(name);
    if(this.parent) return this.parent.get(name);
    throw new KatzoError(`variable inconnue : '${name}'`);
  }
  has(name){
    if(this.vars.has(name)) return true;
    if(this.parent) return this.parent.has(name);
    return false;
  }
  set(name, value){
    let scope=this;
    while(scope){
      if(scope.vars.has(name)){ scope.vars.set(name, value); return; }
      scope=scope.parent;
    }
    this.vars.set(name, value);
  }
  declare(name, value){ this.vars.set(name, value); }
}

function truthy(v){ return !!v; }
function toDisplay(v){
  if(v===null||v===undefined) return 'rien';
  if(typeof v==='boolean') return v ? 'vrai' : 'faux';
  if(v && v.__katzoSprite) return `[sprite ${v.id}]`;
  return String(v);
}

const KEY_ALIASES = {
  'haut':'ArrowUp','bas':'ArrowDown','gauche':'ArrowLeft','droite':'ArrowRight',
  'flechehaut':'ArrowUp','flechebas':'ArrowDown','flechegauche':'ArrowLeft','flechedroite':'ArrowRight',
  'espace':' ','entree':'Enter','entrée':'Enter',
};
['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z']
  .forEach(l=>{ KEY_ALIASES[l]=l; });

function normalizeKeyName(name){
  return String(name).toLowerCase().replace(/[\s_-]/g,'');
}

/* ============== 4. INTERPRÉTEUR ============== */
class Interpreter{
  constructor(io){
    this.io = io;
    this.global = new Scope();
    this.maxSteps = 300000;
    this.steps = 0;
    this.sprites = [];
    this.spriteIdCounter = 1;
    this.startHooks = [];
    this.frameHooks = [];
    this.stopped = false;
    this.keysDown = io.keysDown;
    this.registerNatives();
  }

  registerNatives(){
    const self = this;
    this.natives = {
      'aleatoire': (min,max)=> Math.floor(Math.random()*(max-min+1))+min,
      'aléatoire': (min,max)=> Math.floor(Math.random()*(max-min+1))+min,
      'arrondi': (x)=> Math.round(x),
      'racine': (x)=> Math.sqrt(x),
      'absolu': (x)=> Math.abs(x),
      'longueur': (x)=> (typeof x==='string') ? x.length : 0,
      'min': (...xs)=> Math.min(...xs),
      'max': (...xs)=> Math.max(...xs),
      'creerSprite': (x,y,w,h,couleur,forme)=>{
        const s = new KatzoSprite(self.spriteIdCounter++, x, y, w, h, couleur, forme);
        self.sprites.push(s);
        return s;
      },
      'touche': (name)=>{
        const norm = normalizeKeyName(name);
        const code = KEY_ALIASES[norm] || name;
        return self.keysDown.has(code) || self.keysDown.has(norm);
      },
      'toucheAppuyee': (name)=> self.natives['touche'](name),
      'collision': (a,b)=>{
        if(!a || !b || !a.__katzoSprite || !b.__katzoSprite) return false;
        return a.x < b.x+b.largeur && a.x+a.largeur > b.x && a.y < b.y+b.hauteur && a.y+a.hauteur > b.y;
      },
      'largeurEcran': ()=> self.io.canvasWidth,
      'hauteurEcran': ()=> self.io.canvasHeight,
    };
  }

  run(ast){ this.execBlock(ast.body, this.global, true); }

  step(){
    this.steps++;
    if(this.steps > this.maxSteps){
      throw new KatzoError('le programme prend trop de temps (boucle infinie ?)');
    }
  }

  execBlock(body, scope, isTopLevel){
    for(const stmt of body){
      if(isTopLevel && stmt.type==='When'){
        if(stmt.hook==='demarre') this.startHooks.push({body:stmt.body, scope});
        else if(stmt.hook==='chaqueFrame') this.frameHooks.push({body:stmt.body, scope});
        continue;
      }
      this.execStatement(stmt, scope);
    }
  }

  execStatement(node, scope){
    this.step();
    switch(node.type){
      case 'VarDecl':{
        const val = this.evalExpr(node.value, scope);
        scope.declare(node.name, val);
        return;
      }
      case 'Assign':{
        let val = this.evalExpr(node.value, scope);
        if(node.op!=='='){
          const curv = scope.get(node.name);
          if(node.op==='+=') val = curv + val;
          else if(node.op==='-=') val = curv - val;
          else if(node.op==='*=') val = curv * val;
          else if(node.op==='/=') val = curv / val;
        }
        scope.set(node.name, val);
        return;
      }
      case 'MemberAssign':{
        const obj = this.evalExpr(node.target.object, scope);
        if(obj===null||obj===undefined) throw new KatzoError(`impossible d'assigner une propriété sur 'rien'`);
        let val = this.evalExpr(node.value, scope);
        const prop = node.target.property;
        if(node.op!=='='){
          const curv = obj[prop];
          if(node.op==='+=') val = curv + val;
          else if(node.op==='-=') val = curv - val;
          else if(node.op==='*=') val = curv * val;
          else if(node.op==='/=') val = curv / val;
        }
        obj[prop] = val;
        return;
      }
      case 'If':{
        const cond = this.evalExpr(node.test, scope);
        if(truthy(cond)){
          this.execBlock(node.consequent, new Scope(scope), false);
        } else if(node.alternate){
          this.execBlock(node.alternate, new Scope(scope), false);
        }
        return;
      }
      case 'Repeat':{
        const count = this.evalExpr(node.count, scope);
        for(let i=0;i<count;i++){
          this.step();
          try{ this.execBlock(node.body, new Scope(scope), false); }
          catch(e){ if(e instanceof BreakSignal) break; if(e instanceof ContinueSignal) continue; throw e; }
        }
        return;
      }
      case 'While':{
        while(truthy(this.evalExpr(node.test, scope))){
          this.step();
          try{ this.execBlock(node.body, new Scope(scope), false); }
          catch(e){ if(e instanceof BreakSignal) break; if(e instanceof ContinueSignal) continue; throw e; }
        }
        return;
      }
      case 'For':{
        const from = this.evalExpr(node.from, scope);
        const to = this.evalExpr(node.to, scope);
        for(let i=from;i<=to;i++){
          this.step();
          const loopScope = new Scope(scope);
          loopScope.declare(node.varName, i);
          try{ this.execBlock(node.body, loopScope, false); }
          catch(e){ if(e instanceof BreakSignal) break; if(e instanceof ContinueSignal) continue; throw e; }
        }
        return;
      }
      case 'FuncDecl':{
        scope.declare(node.name, {__katzoFunc:true, params:node.params, body:node.body, closure:scope});
        return;
      }
      case 'When': return;
      case 'Return':{
        const val = node.value ? this.evalExpr(node.value, scope) : null;
        throw new ReturnSignal(val);
      }
      case 'Break': throw new BreakSignal();
      case 'Continue': throw new ContinueSignal();
      case 'Clear': this.io.clear(); return;
      case 'StopGame': this.stopped = true; throw new BreakSignal();
      case 'Command':{
        const args = node.args.map(a=>this.evalExpr(a, scope));
        this.runCommand(node.kind, args);
        return;
      }
      case 'ExprStatement': this.evalExpr(node.expr, scope); return;
      default: throw new KatzoError('instruction inconnue : '+node.type);
    }
  }

  runCommand(kind, args){
    switch(kind){
      case 'Print': this.io.print(args.map(toDisplay).join(' ')); return;
      case 'Circle': this.io.drawCircle(...args); return;
      case 'Rect': this.io.drawRect(...args); return;
      case 'Text': this.io.drawText(...args); return;
      case 'Line': this.io.drawLine(...args); return;
      case 'Wait': this.io.wait(...args); return;
      case 'Destroy':{
        const s = args[0];
        if(s && s.__katzoSprite){
          s.detruit = true;
          this.sprites = this.sprites.filter(sp=>sp!==s);
        }
        return;
      }
      default: throw new KatzoError('commande inconnue : '+kind);
    }
  }

  evalExpr(node, scope){
    switch(node.type){
      case 'Literal': return node.value;
      case 'Identifier': return scope.get(node.name);
      case 'Member':{
        const obj = this.evalExpr(node.object, scope);
        if(obj===null||obj===undefined) throw new KatzoError(`impossible de lire la propriété '${node.property}' sur 'rien'`);
        return obj[node.property];
      }
      case 'Unary':{
        const v = this.evalExpr(node.expr, scope);
        if(node.op==='-') return -v;
        if(node.op==='non') return !truthy(v);
        return v;
      }
      case 'Binary':{
        const l = this.evalExpr(node.left, scope);
        const r = this.evalExpr(node.right, scope);
        switch(node.op){
          case '+': return (typeof l==='string'||typeof r==='string') ? toDisplay(l)+toDisplay(r) : l+r;
          case '-': return l-r;
          case '*': return l*r;
          case '/': return l/r;
          case '%': return l%r;
          case '==': return l===r;
          case '!=': return l!==r;
          case '>': return l>r;
          case '<': return l<r;
          case '>=': return l>=r;
          case '<=': return l<=r;
        }
        return null;
      }
      case 'Logical':{
        const l = this.evalExpr(node.left, scope);
        if(node.op==='et'){ if(!truthy(l)) return false; return truthy(this.evalExpr(node.right, scope)); }
        else { if(truthy(l)) return true; return truthy(this.evalExpr(node.right, scope)); }
      }
      case 'Call':{
        const args = node.args.map(a=>this.evalExpr(a, scope));
        const calleeName = node.callee.type==='Identifier' ? node.callee.name : null;
        let fn = null;
        if(calleeName){
          if(scope.has(calleeName)) fn = scope.get(calleeName);
        }
        if(fn && fn.__katzoFunc){
          const fnScope = new Scope(fn.closure);
          fn.params.forEach((p,idx)=>fnScope.declare(p, args[idx]));
          try{ this.execBlock(fn.body, fnScope, false); }
          catch(e){ if(e instanceof ReturnSignal) return e.value; throw e; }
          return null;
        }
        if(calleeName && this.natives[calleeName]) return this.natives[calleeName](...args);
        throw new KatzoError(`fonction inconnue : '${calleeName}'`);
      }
      default: throw new KatzoError('expression inconnue : '+node.type);
    }
  }

  runStartHooks(){
    for(const h of this.startHooks){
      this.execBlock(h.body, new Scope(h.scope), false);
    }
  }

  runFrameHooks(){
    for(const h of this.frameHooks){
      try{
        this.execBlock(h.body, new Scope(h.scope), false);
      } catch(e){
        if(e instanceof BreakSignal && this.stopped) throw e;
        if(e instanceof BreakSignal || e instanceof ContinueSignal) continue;
        throw e;
      }
    }
  }
}

/* ============== 5. RENDU CANVAS PAR DÉFAUT ============== */
function drawSpriteOnCtx(ctx, s){
  if(s.forme==='cercle'){
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.largeur/2, 0, Math.PI*2);
    ctx.fillStyle = s.couleur;
    ctx.fill();
  } else {
    ctx.fillStyle = s.couleur;
    ctx.fillRect(s.x, s.y, s.largeur, s.hauteur);
  }
  if(s.texte){
    ctx.fillStyle = '#e8e9ed';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.texte, s.x + s.largeur/2, s.y - 6);
    ctx.textAlign = 'left';
  }
}

/* ============== 6. API PUBLIQUE Katzo.run(...) ============== */
function resolveSource(codeOrId){
  // Si c'est l'id d'une balise <script type="text/katzo">, on lit son contenu.
  const byId = (typeof document!=='undefined') ? document.getElementById(codeOrId) : null;
  if(byId && byId.textContent!==undefined && byId.tagName==='SCRIPT'){
    return byId.textContent;
  }
  return codeOrId; // sinon on suppose que c'est déjà le code source Katzo
}

function run(codeOrId, options){
  options = options || {};
  const canvasEl = (typeof options.canvas === 'string')
    ? document.getElementById(options.canvas)
    : (options.canvas || document.getElementById('katzo-canvas'));

  if(!canvasEl){
    throw new Error("Katzo: impossible de trouver le canvas. Passe options.canvas = 'idDuCanvas'.");
  }
  const ctx = canvasEl.getContext('2d');
  const bgColor = options.background || '#0a0c12';

  const onLog = options.onLog || function(text, type){
    if(type==='error') console.error('[Katzo]', text);
    else console.log('[Katzo]', text);
  };
  const onStatusChange = options.onStatusChange || function(){};

  function clearCanvas(){
    ctx.fillStyle = bgColor;
    ctx.fillRect(0,0,canvasEl.width,canvasEl.height);
  }
  clearCanvas();

  // --- clavier ---
  const keysDown = new Set();
  const needsTabIndex = canvasEl.tabIndex < 0 || canvasEl.tabIndex === undefined;
  if(needsTabIndex) canvasEl.tabIndex = 0;
  function onKeyDown(e){
    keysDown.add(e.key);
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  }
  function onKeyUp(e){ keysDown.delete(e.key); }
  function onClickFocus(){ canvasEl.focus(); }
  canvasEl.addEventListener('keydown', onKeyDown);
  canvasEl.addEventListener('keyup', onKeyUp);
  canvasEl.addEventListener('click', onClickFocus);
  if(options.autoFocus!==false){
    // tente un focus immédiat (peut échouer selon le navigateur tant qu'il n'y a pas eu d'interaction)
    setTimeout(()=>canvasEl.focus(), 0);
  }

  const io = {
    canvasWidth: canvasEl.width,
    canvasHeight: canvasEl.height,
    keysDown,
    print:(txt)=> onLog(txt, 'print'),
    drawCircle:(x,y,r,couleur)=>{
      ctx.beginPath(); ctx.arc(x,y,r||10,0,Math.PI*2);
      ctx.fillStyle = couleur || '#ff6b3d'; ctx.fill();
    },
    drawRect:(x,y,w,h,couleur)=>{
      ctx.fillStyle = couleur || '#3dd6ff'; ctx.fillRect(x,y,w,h);
    },
    drawText:(x,y,txt,couleur,taille)=>{
      ctx.fillStyle = couleur || '#e8e9ed';
      ctx.font = (taille||16)+'px Segoe UI, sans-serif';
      ctx.fillText(String(txt),x,y);
    },
    drawLine:(x1,y1,x2,y2,couleur,epaisseur)=>{
      ctx.strokeStyle = couleur || '#e8e9ed';
      ctx.lineWidth = epaisseur || 2;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    },
    clear: ()=> clearCanvas(),
    wait: ()=> {}
  };

  let rafId = null;
  let running = false;
  let lastFrameTime = 0;

  function stopInternal(){
    running = false;
    if(rafId) cancelAnimationFrame(rafId);
    rafId = null;
    canvasEl.removeEventListener('keydown', onKeyDown);
    canvasEl.removeEventListener('keyup', onKeyUp);
    canvasEl.removeEventListener('click', onClickFocus);
    onStatusChange('stopped');
  }

  function tick(interp, now){
    if(!running) return;
    lastFrameTime = now;
    try{
      interp.runFrameHooks();
      if(interp.frameHooks.length>0 || interp.sprites.length>0){
        clearCanvas();
        for(const s of interp.sprites){ drawSpriteOnCtx(ctx, s); }
      }
    } catch(e){
      if(interp.stopped){
        onLog('Jeu arrêté (arretejeu).', 'ok');
      } else if(e instanceof KatzoError){
        onLog(`Erreur${e.line?(' (ligne '+e.line+')'):''} : ${e.message}`, 'error');
      } else {
        onLog('Erreur interne : '+e.message, 'error');
        console.error(e);
      }
      stopInternal();
      return;
    }
    if(interp.stopped){ stopInternal(); return; }
    rafId = requestAnimationFrame((t)=>tick(interp, t));
  }

  const src = resolveSource(codeOrId);
  let interp;
  try{
    const tokens = lexer(src);
    const ast = FixedParser(tokens);
    interp = new Interpreter(io);
    interp.run(ast);
    interp.runStartHooks();
  } catch(e){
    if(e instanceof KatzoError){
      onLog(`Erreur${e.line?(' (ligne '+e.line+')'):''} : ${e.message}`, 'error');
    } else {
      onLog('Erreur interne : '+e.message, 'error');
      console.error(e);
    }
    return { stop(){} };
  }

  if(interp.frameHooks.length>0){
    running = true;
    onStatusChange('running');
    rafId = requestAnimationFrame((t)=>tick(interp, t));
    onLog('Jeu lancé.', 'info');
  } else {
    if(interp.sprites.length>0){
      clearCanvas();
      for(const s of interp.sprites){ drawSpriteOnCtx(ctx, s); }
    }
    onLog('Programme terminé sans erreur.', 'ok');
  }

  return {
    stop(){ stopInternal(); },
    interp // exposé pour du débogage avancé si besoin
  };
}

const Katzo = {
  run,
  // exposés pour un usage avancé (ex: construire son propre outil autour du moteur)
  lexer, parse: FixedParser, Interpreter, KatzoError, KatzoSprite
};

if(typeof module !== 'undefined' && module.exports){
  module.exports = Katzo;
}
global.Katzo = Katzo;

})(typeof window !== 'undefined' ? window : globalThis);
