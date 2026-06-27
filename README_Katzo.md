# 🐱 Katzo — le langage de programmation en français

Katzo est un mini-langage de programmation que tu écris en français. Il existe sous **deux formes** :

| Fichier | Usage |
|---|---|
| `katzo.html` | **Éditeur tout-en-un** : zone de code + bouton Exécuter + exemples. Pratique pour tester rapidement. |
| `katzo-engine.js` + `index.html` | **Façon Phaser** : le moteur est une bibliothèque externe (`<script src="katzo-engine.js">`) que tu charges dans ta propre page, et tu écris ton code Katzo directement dans ton HTML. C'est ce qu'il faut utiliser pour distribuer un vrai jeu (GitHub Pages, etc.). |

---

## 0. Usage façon Phaser (recommandé pour distribuer un jeu)

Exactement comme tu ferais avec `<script src="phaser.min.js">`, tu charges le moteur Katzo puis tu codes directement dans une balise spéciale :

```html
<canvas id="scene" width="480" height="320"></canvas>

<!-- 1) on charge le moteur -->
<script src="katzo-engine.js"></script>

<!-- 2) on écrit le jeu en Katzo, directement dans le HTML -->
<script type="text/katzo" id="monJeu">
  variable joueur = creerSprite(220, 280, 30, 30, "#3dd6ff", "rectangle")

  quand chaqueFrame {
    si touche("droite") { joueur.x += 4 }
    si touche("gauche") { joueur.x -= 4 }
  }
</script>

<!-- 3) on lance le jeu sur le canvas -->
<script>
  Katzo.run('monJeu', { canvas: 'scene' });
</script>
```

C'est tout. `Katzo.run(idDeLaBaliseKatzo, options)` :
- lit le code dans la balise `<script type="text/katzo" id="...">`
- l'exécute sur le `<canvas>` que tu indiques dans `options.canvas`
- démarre automatiquement la boucle de jeu si ton code contient `quand chaqueFrame`

**Options disponibles :**
```js
Katzo.run('monJeu', {
  canvas: 'scene',          // id du canvas (obligatoire)
  background: '#0a0c12',    // couleur de fond (optionnel)
  onLog: (texte, type) => { // appelé pour affiche/erreurs (optionnel)
    console.log(type, texte); // type = 'print' | 'error' | 'ok' | 'info'
  },
  onStatusChange: (statut) => { // 'running' ou 'stopped' (optionnel)
    console.log('Statut:', statut);
  }
});
```

`Katzo.run()` retourne un objet `{ stop() }` — appelle `.stop()` pour arrêter le jeu depuis ton propre JavaScript (un bouton pause, par exemple) :
```js
const jeu = Katzo.run('monJeu', { canvas: 'scene' });
// plus tard...
jeu.stop();
```

**Pour distribuer ton jeu** (GitHub Pages, etc.), il te suffit de mettre `index.html` et `katzo-engine.js` dans le même dossier — exactement comme tu le ferais avec `phaser.min.js`. Pas besoin d'autre chose.

Tu peux aussi écrire le code Katzo directement en texte plutôt que via une balise `<script>`, si tu préfères le générer dynamiquement :
```js
Katzo.run(`
  affiche "Bonjour depuis une chaîne de texte"
`, { canvas: 'scene' });
```

---

## 1. Démarrage rapide (éditeur tout-en-un, katzo.html)

1. Ouvre `katzo.html` dans un navigateur.
2. Clique sur **Exemples ▾** pour faire défiler les modèles fournis (dessin, boucle, et 2 jeux complets).
3. Modifie le code, clique **▶ Exécuter**.
4. Si c'est un jeu (il y a un bloc `quand chaqueFrame`), clique une fois sur le canvas pour activer le clavier, puis joue.
5. **■ Stop** arrête un jeu en cours à tout moment.

---

## 2. Les deux modes d'exécution

Katzo détecte automatiquement ce que tu veux faire :

- **Mode script** : ton code n'a pas de bloc `quand chaqueFrame` → il s'exécute une seule fois, de haut en bas, comme un programme normal.
- **Mode jeu** : ton code contient un bloc `quand chaqueFrame { ... }` → Katzo lance une **boucle de jeu** automatique (environ 60 fois par seconde) qui répète ce bloc, redessine l'écran, et écoute le clavier.

Tu n'as rien à activer toi-même : si tu écris `quand chaqueFrame`, le mode jeu démarre automatiquement à l'exécution.

---

## 3. Bases du langage

### Variables
```katzo
variable score = 0
variable nom = "Shelly"
variable actif = vrai
```
- Pas de virgule, pas de point-virgule obligatoire (un saut de ligne sépare les instructions).
- Types : nombres, texte entre guillemets `"..."`, `vrai`/`faux`, et `rien` (équivalent de "null"/vide).

### Affichage
```katzo
affiche "Bonjour", nom, "tu as", score, "points"
```
`affiche` accepte plusieurs valeurs séparées par des virgules, les concatène avec un espace.

### Opérateurs
| Catégorie | Symboles |
|---|---|
| Arithmétique | `+` `-` `*` `/` `%` |
| Comparaison | `==` `!=` `>` `<` `>=` `<=` |
| Logique | `et` `ou` `non` |
| Affectation | `=` `+=` `-=` `*=` `/=` |

`+` sur du texte fait une concaténation : `"Score: " + score`.

### Conditions
```katzo
si score >= 90 {
  affiche "Excellent"
} sinonsi score >= 50 {
  affiche "Pas mal"
} sinon {
  affiche "Réessaie"
}
```

### Boucles
```katzo
répète 5 {
  affiche "Coucou"
}

pour i de 1 à 10 {
  affiche i
}

variable i = 0
tantque i < 100 {
  i += 1
}
```
- `casse` (ou `arrete`) sort de la boucle.
- `continue` passe directement au tour suivant.

### Fonctions
```katzo
fonction carre(x) {
  retourne x * x
}

affiche carre(7)   // affiche 49
```
Les fonctions peuvent s'appeler elles-mêmes (récursivité fonctionne).

### Fonctions natives utiles
| Fonction | Rôle |
|---|---|
| `aleatoire(min, max)` | nombre entier au hasard entre min et max inclus |
| `arrondi(x)` | arrondit un nombre |
| `racine(x)` | racine carrée |
| `absolu(x)` | valeur absolue |
| `longueur(texte)` | longueur d'une chaîne de caractères |
| `min(a, b, ...)` / `max(a, b, ...)` | minimum / maximum |

---

## 4. Dessiner sur le canvas (mode script)

```katzo
efface                                          // vide l'écran
cercle x, y, rayon, "couleur"
rectangle x, y, largeur, hauteur, "couleur"
ligne x1, y1, x2, y2, "couleur", epaisseur
texte x, y, "ton texte", "couleur", taille
```
Les couleurs s'écrivent en code hexadécimal (`"#ff6b3d"`) ou en nom CSS (`"red"`, `"orange"`...).

---

## 5. Faire un jeu 2D — le cœur du système

### 5.1 Les sprites

Un **sprite** est un objet visible à l'écran (joueur, ennemi, pièce, balle...) que tu peux déplacer et tester en collision.

```katzo
variable joueur = creerSprite(x, y, largeur, hauteur, "couleur", "forme")
```
- `forme` vaut `"rectangle"` ou `"cercle"` (optionnel, rectangle par défaut).
- `creerSprite` te renvoie l'objet : garde-le dans une variable pour pouvoir le manipuler ensuite.

**Propriétés d'un sprite** (lecture et écriture avec le point `.`) :

| Propriété | Description |
|---|---|
| `.x` `.y` | position |
| `.largeur` `.hauteur` | taille |
| `.couleur` | couleur (modifiable en cours de jeu) |
| `.vx` `.vy` | libres, à toi de les utiliser comme vitesse si tu veux |
| `.texte` | texte affiché au-dessus du sprite (ex: nom, vie) |

```katzo
joueur.x += 5          // déplace vers la droite
joueur.couleur = "#ff0000"
si joueur.y > 300 { joueur.y = 300 }
```

Pour supprimer un sprite :
```katzo
detruit joueur
```

### 5.2 Les blocs `quand`

```katzo
quand demarre {
  // exécuté UNE SEULE FOIS, juste avant le lancement du jeu
  // utile pour préparer les positions initiales, par exemple
}

quand chaqueFrame {
  // exécuté en boucle, ~60 fois par seconde
  // c'est ici que tu gères mouvement, collisions, score, affichage
}
```
Tu peux avoir plusieurs blocs `quand demarre` ou `quand chaqueFrame` si tu veux séparer ta logique — ils s'exécutent tous, dans l'ordre où ils apparaissent dans le fichier.

### 5.3 Le clavier

```katzo
si touche("gauche") { joueur.x -= 4 }
si touche("droite") { joueur.x += 4 }
si touche("haut") { joueur.y -= 4 }
si touche("bas") { joueur.y += 4 }
si touche("espace") { ... }
si touche("a") { ... }    // les lettres marchent aussi
```
Touches reconnues : `"haut"`, `"bas"`, `"gauche"`, `"droite"`, `"espace"`, `"entree"`, et toutes les lettres `"a"` à `"z"`.

⚠️ Le clavier ne fonctionne que si le canvas a le focus — clique une fois dessus avant de jouer.

### 5.4 Les collisions

```katzo
si collision(joueur, ennemi) {
  affiche "Touché !"
}
```
`collision(a, b)` renvoie `vrai` si les deux sprites se chevauchent (détection rectangle, fonctionne aussi pour les cercles en approximation).

### 5.5 Texte et score pendant le jeu

Les commandes de dessin (`texte`, `cercle`, `rectangle`, `ligne`) marchent aussi à l'intérieur de `quand chaqueFrame` — pratique pour afficher le score en permanence :
```katzo
texte 10, 20, "Score : " + score, "#e8e9ed", 18
```

### 5.6 Arrêter le jeu depuis le code

```katzo
arretejeu
```
Stoppe la boucle de jeu proprement (équivalent au bouton **■ Stop**).

### 5.7 Infos sur l'écran

```katzo
largeurEcran()   // renvoie 480
hauteurEcran()   // renvoie 320
```
Utile pour ne pas coder les bords en dur.

---

## 6. Exemple complet commenté

```katzo
// Déplace le carré avec les flèches, attrape les étoiles jaunes !
variable joueur = creerSprite(220, 280, 30, 30, "#3dd6ff", "rectangle")
variable score = 0
variable etoile = rien

quand demarre {
  etoile = creerSprite(aleatoire(20,440), aleatoire(20,200), 16, 16, "#ffd23d", "cercle")
}

quand chaqueFrame {
  // déplacement
  si touche("gauche") { joueur.x -= 4 }
  si touche("droite") { joueur.x += 4 }
  si touche("haut") { joueur.y -= 4 }
  si touche("bas") { joueur.y += 4 }

  // on garde le joueur dans l'écran
  si joueur.x < 0 { joueur.x = 0 }
  si joueur.x > 450 { joueur.x = 450 }
  si joueur.y < 0 { joueur.y = 0 }
  si joueur.y > 290 { joueur.y = 290 }

  // collision = on marque un point et l'étoile réapparaît ailleurs
  si collision(joueur, etoile) {
    score += 1
    etoile.x = aleatoire(20, 440)
    etoile.y = aleatoire(20, 280)
  }

  texte 10, 20, "Score : " + score, "#e8e9ed", 18
}
```

C'est exactement le premier exemple "JEU" fourni dans l'outil — utilise-le comme modèle de base pour tes propres jeux.

---

## 7. Aide-mémoire (cheat sheet)

```
variable nom = valeur
si cond { } sinonsi cond { } sinon { }
répète n { }
tantque cond { }
pour i de a à b { }
fonction nom(params) { retourne valeur }
casse / continue

affiche v1, v2, ...
efface
cercle x, y, rayon, couleur
rectangle x, y, largeur, hauteur, couleur
ligne x1, y1, x2, y2, couleur, epaisseur
texte x, y, "texte", couleur, taille

creerSprite(x, y, largeur, hauteur, couleur, forme) -> sprite
sprite.x / .y / .largeur / .hauteur / .couleur / .vx / .vy / .texte
detruit sprite
collision(spriteA, spriteB) -> vrai/faux
touche("nom_touche") -> vrai/faux
largeurEcran() / hauteurEcran()

quand demarre { }        // une fois au lancement
quand chaqueFrame { }    // boucle de jeu (~60x/seconde)
arretejeu                // stoppe la boucle

aleatoire(min, max), arrondi(x), racine(x), absolu(x), longueur(texte), min(...), max(...)
```

---

## 8. Limites actuelles (pour info)

- Pas encore de tableaux/listes (`liste = [...]`) — chaque sprite doit avoir sa propre variable pour le moment.
- Pas de son.
- `collision()` fonctionne en boîte rectangulaire même pour les cercles (suffisant pour la plupart des jeux simples, mais pas pixel-perfect).
- Une boucle infinie en **mode script** (sans `quand chaqueFrame`) est détectée et stoppée automatiquement après un grand nombre d'étapes, pour éviter de bloquer le navigateur.

Si tu veux que j'ajoute les listes, le son, ou des formes de collision plus précises, dis-le moi — c'est une extension naturelle du même moteur.
