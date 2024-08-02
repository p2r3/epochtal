window.generateAnimationText = (config, runners, tas) =>
(`Session: ${config.number} (${Date.now()})
maxplayers set to ${runners}
\n\n\n\n\n\n\n
Stopping All Sounds...
Stopping: Channel:64 *#music/dustyhobo/Dreams.mp3
\n\n\n\n\n\n\n
---- Host_NewTournament ----
Execing config: epochtal.cfg
Network: IP 95.217.182.22, mode SP, dedicated No, ports 0 SV / 0 CL
Opened Steam Socket NS_SERVER ( socket 44 )
Opened Steam Socket NS_CLIENT ( socket 45 )
Network: IP 95.217.182.22, mode MP, dedicated No, ports 27015 SV / 27005 CL
Host_NewTournament on map ${config.map.title} by ${config.map.author}
\n\n\n\n\n\n\n
Created class baseline: 27 classes, 4810 bytes.
state = 1
1.000:  Sending HTTP connect to public IP 95.217.182.22:8080
Server using '&lt;none&gt;' lobbies, requiring pw no, lobby id 0
RememberIPAddressForLobby: lobby 0 from address loopback
state = 2
m_currentState = 4
\n\n\n\n\n\n\n
Portal 2
Map: ${config.map.title}
Players: ${runners} (${tas} bots) / ${runners - tas} humans
Build: 8637
Server Number: 4
\n\n\n\n\n\n\n
state = 3
state = 4
[PORTAL2 PUZZLEMAKER]  --------START loading assets--------

[PORTAL2 PUZZLEMAKER]  ---------END loading assets---------
\n\n\n\n\n\n\n
state = 5
Switching to default start scene
Sending full update to TournamentUI (TournamentUI can't find stats from tick -1)
UncacheUnusedSpeedruns - 0ms
Queued Submission System: ENABLED!
\n\n\n\n\n\n\n
state = 6
Session Started!
Load took: 936ms
=======================Trying to GivePlayerPortalgun
=======================Trying to UpgradePlayerPortalgun
\n\n\n\n\n\n\n
Redownloading all demos
T_RedownloadAllDemos took 1489839 msec!

Setting opening scene to tournament/main`);