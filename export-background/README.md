# Arrière-plan animé (MeshGradient)

Copiez `GlobalBackground.tsx` dans votre projet (ex. `src/components/GlobalBackground.tsx`).

## Dépendance

```bash
npm install @paper-design/shaders-react
```

## Prérequis

- React 18+
- **Tailwind CSS** recommandé (classes `fixed`, `inset-0`, `z-0`, `pointer-events-none`, etc.). Sans Tailwind, appliquez l’équivalent en CSS sur le `div` racine.

## Intégration

1. Placez `<GlobalBackground />` une fois au niveau racine de l’app (souvent dans `App.tsx`).
2. Mettez tout le contenu de l’interface dans un wrapper avec `relative z-10 min-h-screen` pour qu’il passe au-dessus du fond.

Exemple :

```tsx
import { GlobalBackground } from "./components/GlobalBackground"

export default function App() {
  return (
    <>
      <GlobalBackground />
      <div className="relative z-10 min-h-screen w-full">
        {/* votre router / pages */}
      </div>
    </>
  )
}
```

## Personnalisation

- **Couleurs** : modifiez le tableau `colors` (chaînes HSL ou CSS valides acceptées par le composant).
- **Vitesse** : prop `speed` (ex. `0.10` = lent).
- **Forme** : `distortion`, `swirl`, `scale`, `rotation`, `offsetX`, `offsetY`.

## Source

Extrait du projet AXYOS Renov / AppBTP — même logique que `client/src/components/GlobalBackground.tsx`.
