export interface BaseTeam {
  id: string;
  name: string;
  abbreviation: string;
  sport: string;
}

export interface BasePlayer {
  id: string;
  name: string;
  teamId: string;
  position: string;
  sport: string;
}

export interface SportService<TPlayer = BasePlayer, TTeam = BaseTeam> {
  sport: string;
  getAllPlayers(): TPlayer[];
  getPlayerById(id: string): TPlayer | undefined;
  getPlayersByTeam(teamId: string): TPlayer[];
  getAllTeams(): TTeam[];
  getTeamById(id: string): TTeam | undefined;
}
