import { normalizeFirmId } from "./firms.js";

export const FIRM_REPRESENTATIVES = Object.freeze({
  astra:Object.freeze({
    name:"Kael Vorn",
    title:"Commandant d'Astra",
    asset:"assets/firms/representatives/astra.png",
    badge:"assets/firms/astra.svg",
    role:"Commandement offensif",
    motto:"Frapper vite. Tenir toujours.",
    speech:"Astra ne recule devant aucun secteur hostile. Rejoins-nous et transforme chaque bataille en territoire conquis."
  }),
  cyan:Object.freeze({
    name:"Soren Vale",
    title:"Stratège de Cygnus",
    asset:"assets/firms/representatives/cygnus.png",
    badge:"assets/firms/cyan.svg",
    role:"Stratégie et maîtrise",
    motto:"Voir plus loin. Agir avec précision.",
    speech:"Cygnus gagne avant le premier tir. Nos pilotes dominent par la discipline, la technologie et une stratégie sans faille."
  }),
  verte:Object.freeze({
    name:"Elara Veyn",
    title:"Commandante de Verdantis",
    asset:"assets/firms/representatives/verdantis.png",
    badge:"assets/firms/verte.svg",
    role:"Expansion et résilience",
    motto:"Grandir. Protéger. Persévérer.",
    speech:"Verdantis transforme les mondes hostiles en bastions vivants. Ensemble, nous survivons, progressons et ne cédons rien."
  }),
  jaune:Object.freeze({
    name:"Cassian Sol",
    title:"Préfet de Solarys",
    asset:"assets/firms/representatives/solarys.png",
    badge:"assets/firms/jaune.svg",
    role:"Prestige et puissance",
    motto:"Rayonner au-dessus des autres.",
    speech:"Solarys rassemble les pilotes qui refusent l'ordinaire. Porte nos couleurs et grave ton nom dans la lumière des étoiles."
  })
});

export function getFirmRepresentative(firmId){
  return FIRM_REPRESENTATIVES[normalizeFirmId(firmId)] || FIRM_REPRESENTATIVES.astra;
}
