export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// --- ADD THE CODE BELOW THIS LINE ---

export const RANK_SYSTEM = [
    { title: "Initiate", minElo: 0, maxElo: 499, color: "text-gray-500", badgeId: "initiate" },
    { title: "Scout", minElo: 500, maxElo: 699, color: "text-slate-400", badgeId: "scout" },
    { title: "Recruit", minElo: 700, maxElo: 999, color: "text-amber-700", badgeId: "recruit" },
    { title: "Agent", minElo: 1000, maxElo: 1299, color: "text-gray-300", badgeId: "agent" },
    { title: "Operative", minElo: 1300, maxElo: 1599, color: "text-yellow-400", badgeId: "operative" },
    { title: "Specialist", minElo: 1600, maxElo: 1899, color: "text-teal-400", badgeId: "specialist" },
    { title: "Hacker", minElo: 1900, maxElo: 2199, color: "text-green-500", badgeId: "hacker" },
    { title: "Architect", minElo: 2200, maxElo: 2399, color: "text-purple-500", badgeId: "architect" },
    { title: "Mastermind", minElo: 2400, maxElo: 2599, color: "text-red-500", badgeId: "mastermind" },
    { title: "Ghost", minElo: 2600, maxElo: Infinity, color: "text-white", badgeId: "ghost" }
];

export const getRankFromElo = (elo: number) => {
    return RANK_SYSTEM.find(r => elo >= r.minElo && elo <= r.maxElo) || RANK_SYSTEM[0];
};