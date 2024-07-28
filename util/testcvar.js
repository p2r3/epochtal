/* eslint-disable no-unused-vars */
const UtilError = require("./error.js");

const [VERDICT_SAFE, VERDICT_UNSURE, VERDICT_ILLEGAL] = [0, 1, 2];

const cvarTestSafe = {
  "_autosave": (val) => true, // cmd autosave
  "_autosavedangerous": (val) => true, // cmd autosavedangerous
  "_bugreporter_restart": (val) => false, // cmd restarts bug reporter .dll
  "_fov": (val) => val == 0, // automates fov command to server.
  "_record": (val) => false, // cmd record a demo incrementally.
  "_resetgamestats": (val) => false, // cmd erases current game stats and writes out a blank stats file
  "_restart": (val) => false, // cmd shutdown and restart the engine.
  "addip": (val) => false, // cmd add an ip address to the ban list.
  "adsp_alley_min": (val) => true, //
  "adsp_courtyard_min": (val) => true, //
  "adsp_debug": (val) => true, //
  "adsp_door_height": (val) => true, //
  "adsp_duct_min": (val) => true, //
  "adsp_hall_min": (val) => true, //
  "adsp_low_ceiling": (val) => true, //
  "adsp_opencourtyard_min": (val) => true, //
  "adsp_openspace_min": (val) => true, //
  "adsp_openstreet_min": (val) => true, //
  "adsp_openwall_min": (val) => true, //
  "adsp_reset_nodes": (val) => true, // cmd
  "adsp_room_min": (val) => true, //
  "adsp_street_min": (val) => true, //
  "adsp_tunnel_min": (val) => true, //
  "adsp_wall_height": (val) => true, //
  "ai_actbusy_search_time": (val) => val == 10, //
  "ai_auto_contact_solver": (val) => val == 1, //
  "ai_block_damage": (val) => val == 0, //
  "ai_clear_bad_links": (val) => false, // cmd clears bits set on nav links indicating link is unusable
  "ai_debug_actbusy": (val) => val == 0, // used to debug actbusy behavior. usage: 1: constantly draw lines from npcs to the actbusy nodes they've chosen to actbusy at. 2:
  "ai_debug_assault": (val) => val == 0, //
  "ai_debug_avoidancebounds": (val) => val == 0, //
  "ai_debug_directnavprobe": (val) => val == 0, //
  "ai_debug_doors": (val) => val == 0, //
  "ai_debug_dyninteractions": (val) => val == 0, // debug the npc dynamic interaction system.
  "ai_debug_efficiency": (val) => val == 0, //
  "ai_debug_enemies": (val) => val == 0, //
  "ai_debug_enemyfinders": (val) => val == 0, //
  "ai_debug_eventresponses": (val) => val == 0, // set to 1 to see all npc response events trigger, and which npcs choose to respond to them.
  "ai_debug_expressions": (val) => val == 0, // show random expression decisions for npcs.
  "ai_debug_follow": (val) => val == 0, //
  "ai_debug_loners": (val) => val == 0, //
  "ai_debug_looktargets": (val) => val == 0, //
  "ai_debug_los": (val) => val == 0, // npc line-of-sight debug mode. if 1, solid entities that block npc loc will be highlighted with white bounding boxes. if 2, it'l
  "ai_debug_nav": (val) => val == 0, //
  "ai_debug_node_connect": (val) => false, // cmd debug the attempted connection between two nodes
  "ai_debug_ragdoll_magnets": (val) => val == 0, //
  "ai_debug_shoot_positions": (val) => val == 0, //
  "ai_debug_speech": (val) => val == 0, //
  "ai_debug_squads": (val) => val == 0, //
  "ai_debug_think_ticks": (val) => val == 0, //
  "ai_debugscriptconditions": (val) => val == 0, //
  "ai_default_efficient": (val) => val == 0, //
  "ai_disable": (val) => false, // cmd bi-passes all ai logic routines and puts all npcs into their idle animations.  can be used to get npcs out of your way and to t
  "ai_drawbattlelines": (val) => val == 0, //
  "ai_drop_hint": (val) => false, // cmd drop an ai_hint at the player's current eye position.
  "ai_dump_hints": (val) => false, // cmd
  "ai_ef_hate_npc_duration": (val) => val == 1, //
  "ai_ef_hate_npc_frequency": (val) => val == 5, //
  "ai_efficiency_override": (val) => val == 0, //
  "ai_enable_fear_behavior": (val) => val == 1, //
  "ai_expression_frametime": (val) => val == 0, // maximum frametime to still play background expressions.
  "ai_expression_optimization": (val) => val == 0, // disable npc background expressions when you can't see them.
  "ai_fear_player_dist": (val) => val == 720, //
  "ai_find_lateral_cover": (val) => val == 1, //
  "ai_find_lateral_los": (val) => val == 1, //
  "ai_follow_use_points": (val) => val == 1, //
  "ai_follow_use_points_when_moving": (val) => val == 1, //
  "ai_force_serverside_ragdoll": (val) => val == 0, //
  "ai_frametime_limit": (val) => val == 50, // frametime limit for min efficiency aie_normal (in sec's).
  "ai_hull": (val) => false, // cmd controls which connections are shown when ai_show_hull or ai_show_connect commands are used  arguments: npc name or classname,
  "ai_inhibit_spawners": (val) => val == 0, //
  "ai_lead_time": (val) => val == 0, //
  "ai_los_mode": (val) => val == 0, //
  "ai_moveprobe_debug": (val) => val == 0, //
  "ai_moveprobe_jump_debug": (val) => val == 0, //
  "ai_moveprobe_usetracelist": (val) => val == 0, //
  "ai_nav_debug_experimental_pathing": (val) => val == 0, // draw paths tried during search for bodysnatcher pathing
  "ai_navigator_generate_spikes": (val) => val == 0, //
  "ai_navigator_generate_spikes_strength": (val) => val == 8, //
  "ai_next_hull": (val) => false, // cmd cycles through the various hull sizes.  currently selected hull size is written to the screen.  controls which connections are
  "ai_no_local_paths": (val) => val == 0, //
  "ai_no_node_cache": (val) => val == 0, //
  "ai_no_select_box": (val) => val == 0, //
  "ai_no_steer": (val) => val == 0, //
  "ai_no_talk_delay": (val) => val == 0, //
  "ai_nodes": (val) => false, // cmd toggles node display.  first call displays the nodes for the given network as green objects.  second call  displays the nodes a
  "ai_norebuildgraph": (val) => val == 0, //
  "ai_path_adjust_speed_on_immediate_turns": (val) => val == 1, //
  "ai_path_insert_pause_at_est_end": (val) => val == 1, //
  "ai_path_insert_pause_at_obstruction": (val) => val == 1, //
  "ai_post_frame_navigation": (val) => val == 0, //
  "ai_radial_max_link_dist": (val) => val == 512, //
  "ai_reaction_delay_alert": (val) => val == 0, //
  "ai_reaction_delay_idle": (val) => val == 0, //
  "ai_rebalance_thinks": (val) => val == 1, //
  "ai_report_task_timings_on_limit": (val) => val == 0, //
  "ai_resume": (val) => false, // cmd if npc is stepping through tasks (see ai_step ) will resume normal processing.
  "ai_sequence_debug": (val) => val == 0, //
  "ai_set_move_height_epsilon": (val) => false, // cmd set how high ai bumps up ground walkers when checking steps
  "ai_setenabled": (val) => false, // cmd like ai_disable but you manually specify the state (with a 0 or 1) instead of toggling it.
  "ai_setupbones_debug": (val) => val == 0, // shows that bones that are setup every think
  "ai_shot_bias": (val) => val == 1, //
  "ai_shot_bias_max": (val) => val == 1, //
  "ai_shot_bias_min": (val) => val == -1, //
  "ai_shot_stats": (val) => val == 0, //
  "ai_shot_stats_term": (val) => val == 1000, //
  "ai_show_connect": (val) => false, // cmd displays the allowed connections between each node for the currently selected hull type.  hulls are color code as follows:  gre
  "ai_show_connect_crawl": (val) => false, // cmd displays the allowed connections between each node for the currently selected hull type.  hulls are color code as follows:  gre
  "ai_show_connect_fly": (val) => false, // cmd displays the allowed connections between each node for the currently selected hull type.  hulls are color code as follows:  gre
  "ai_show_connect_jump": (val) => false, // cmd displays the allowed connections between each node for the currently selected hull type.  hulls are color code as follows:  gre
  "ai_show_graph_connect": (val) => false, // cmd toggles graph connection display for the node that the player is looking at.  nodes that are connected to the selected node by
  "ai_show_grid": (val) => false, // cmd draw a grid on the floor where looking.
  "ai_show_hints": (val) => false, // cmd displays all hints as small boxes  blue  - hint is available for use  red  - hint is currently being used by an npc  orange  -
  "ai_show_hull": (val) => false, // cmd displays the allowed hulls between each node for the currently selected hull type.  hulls are color code as follows:  green  -
  "ai_show_hull_attacks": (val) => val == 0, //
  "ai_show_node": (val) => false, // cmd highlight the specified node
  "ai_show_think_tolerance": (val) => val == 0, //
  "ai_show_visibility": (val) => false, // cmd toggles visibility display for the node that the player is looking at.  nodes that are visible from the selected node will be d
  "ai_simulate_task_overtime": (val) => val == 0, //
  "ai_spread_cone_focus_time": (val) => val == 0, //
  "ai_spread_defocused_cone_multiplier": (val) => val == 3, //
  "ai_spread_pattern_focus_time": (val) => val == 0, //
  "ai_step": (val) => false, // cmd npcs will freeze after completing their current task.  to complete the next task, use 'ai_step' again.  to resume processing no
  "ai_strong_optimizations": (val) => val == 0, //
  "ai_strong_optimizations_no_checkstand": (val) => val == 0, //
  "ai_task_pre_script": (val) => val == 0, //
  "ai_test_los": (val) => false, // cmd test ai los from the player's pov
  "ai_test_moveprobe_ignoresmall": (val) => val == 0, //
  "ai_think_limit_label": (val) => val == 0, //
  "ai_use_clipped_paths": (val) => val == 1, //
  "ai_use_efficiency": (val) => val == 1, //
  "ai_use_frame_think_limits": (val) => val == 1, //
  "ai_use_think_optimizations": (val) => val == 1, //
  "ai_use_visibility_cache": (val) => val == 1, //
  "ai_vehicle_avoidance": (val) => val == 1, //
  "ainet_generate_report": (val) => false, // cmd generate a report to the console.
  "ainet_generate_report_only": (val) => false, // cmd generate a report to the console.
  "air_density": (val) => false, // cmd changes the density of air for drag computations.
  "alias": (val) => true, // cmd alias a command.
  "+alt1": (val) => true, // cmd
  "-alt1": (val) => true, // cmd
  "+alt2": (val) => true, // cmd
  "-alt2": (val) => true, // cmd
  "anim_3wayblend": (val) => true, // toggle the 3-way animation blending code.
  "anim_showmainactivity": (val) => val == 0, // show the idle, walk, run, and/or sprint activities.
  "askconnect_accept": (val) => false, // cmd accept a redirect request by the server.
  "asw_engine_finished_building_map": (val) => false, // cmd notify engine that we've finished building a map
  "async_allow_held_files": (val) => true, // allow asyncbegin/endread()
  "async_mode": (val) => true, // set the async filesystem mode (0 = async, 1 = synchronous)
  "async_resume": (val) => false, // cmd
  "async_serialize": (val) => val == 0, // force async reads to serialize for profiling
  "async_simulate_delay": (val) => val == 0, // simulate a delay of up to a set msec per file operation
  "async_suspend": (val) => false, // cmd
  "+attack": (val) => true, // cmd
  "-attack": (val) => true, // cmd
  "+attack2": (val) => true, // cmd
  "-attack2": (val) => true, // cmd
  "audit_save_in_memory": (val) => false, // cmd audit the memory usage and files in the save-to-memory system
  "autoaim_max_deflect": (val) => val == 0, //
  "autoaim_max_dist": (val) => val == 2160, //
  "autosave": (val) => true, // cmd autosave
  "autosavedangerous": (val) => true, // cmd autosavedangerous
  "autosavedangerousissafe": (val) => true, // cmd
  "+back": (val) => true, // cmd
  "-back": (val) => true, // cmd
  "banid": (val) => false, // cmd add a user id to the ban list.
  "banip": (val) => false, // cmd add an ip address to the ban list.
  "bench_end": (val) => false, // cmd ends gathering of info.
  "bench_start": (val) => false, // cmd starts gathering of info. arguments: filename to write results into
  "bench_upload": (val) => false, // cmd uploads most recent benchmark stats to the valve servers.
  "benchframe": (val) => false, // cmd takes a snapshot of a particular frame in a time demo.
  "bind": (val) => true, // cmd bind a key.
  "bind_osx": (val) => true, // cmd bind a key for osx only.
  "bindtoggle": (val) => true, // cmd performs a bind <key> 'increment var <cvar> 0 1 1'
  "bink_dump_precached_movies": (val) => false, // cmd dumps information about all precached bink movies
  "bink_mat_queue_mode": (val) => true, // update bink on mat queue thread if mat_queue_mode is on (if turned off, always update bink on main thread; may cause stalls!)
  "bink_preload_videopanel_movies": (val) => true, // preload bink movies used by videopanel.
  "bink_try_load_vmt": (val) => true, // try and load a vmt with the same name as the bik file to override settings
  "bink_use_preallocated_scratch_texture": (val) => val == 1, // use a pre-allocated vtf instead of creating a new one and deleting it for every texture update. gameconsole only.
  "blackbox": (val) => val == 1, //
  "blackbox_dump": (val) => false, // cmd dump the contents of the blackbox
  "blackbox_record": (val) => false, // cmd record an entry into the blackbox
  "blendbonesmode": (val) => val == 2, //
  "blink_duration": (val) => true, // how many seconds an eye blink will last.
  "blobs_paused": (val) => val == 0, //
  "bot": (val) => false, // cmd add a bot.
  "bot_command": (val) => false, // cmd <bot name> <command string...>.  sends specified command on behalf of specified bot
  "bot_defend": (val) => val == 0, // set to a team number, and that team will all keep their combat shields raised.
  "bot_dontmove": (val) => val == 0, //
  "bot_equip": (val) => false, // cmd generate an item and have the bot equip it.  format: bot_equip <bot name> <item name>
  "bot_flipout": (val) => val == 0, // when on, all bots fire their guns.
  "bot_follow": (val) => val == 0, // when on, bot will follow the player.
  "bot_following_distance": (val) => val == 200, // distance that bot will follow the player.
  "bot_forceattack2": (val) => val == 0, // when firing, use attack2.
  "bot_forceattackon": (val) => val == 0, // when firing, don't tap fire, hold it down.
  "bot_forcefireweapon": (val) => val == 0, // force bots with the specified weapon to fire.
  "bot_jump": (val) => val == 0, // force all bots to repeatedly jump.
  "bot_kill": (val) => false, // cmd <bot id>.  kills bot.
  "bot_look": (val) => val == 0, // when on, bot will look at what the player is looking.
  "bot_mimic": (val) => val == 0, // bot uses usercmd of player by index.
  "bot_mimic_yaw_offset": (val) => val == 180, // offsets the bot yaw.
  "bot_randomnames": (val) => val == 0, //
  "bot_refill": (val) => false, // cmd refill all bot ammo counts
  "bot_requestswap": (val) => val == 0, // force bot to request swap weapon from player.
  "bot_selectweapon": (val) => false, // cmd
  "bot_selectweaponslot": (val) => val == -1, // set to weapon slot that bot should switch to.
  "bot_selectweaponsubtype": (val) => val == -1, // set to weapon subtype that bot should switch to.
  "bot_taunt": (val) => val == 0, // force all bots to repeatedly taunt.
  "bot_teleport": (val) => false, // cmd teleport the specified bot to the specified position & angles.  format: bot_teleport <bot name> <x> <y> <z> <pitch> <yaw> <roll
  "bot_throw": (val) => val == 0, // when on, bot will throw current weapon.
  "bounce_paint_color": (val) => true, // color for bounce paint
  "bounce_paint_min_speed": (val) => val == 500, // for tweaking how high bounce paint launches the player.
  "bounce_paint_wall_jump_upward_speed": (val) => val == 275, // the upward velocity added when bouncing off a wall
  "box": (val) => false, // cmd draw a debug box.
  "+break": (val) => false, // cmd
  "-break": (val) => false, // cmd
  "breakable_disable_gib_limit": (val) => true, //
  "breakable_multiplayer": (val) => true, //
  "buddha": (val) => false, // cmd toggle.  player takes damage but won't die. (shows red cross when health is zero)
  "budget_averages_window": (val) => true, // number of frames to look at when figuring out average frametimes
  "budget_background_alpha": (val) => true, // how translucent the budget panel is
  "budget_bargraph_background_alpha": (val) => true, // how translucent the budget panel is
  "budget_bargraph_range_ms": (val) => true, // budget bargraph range in milliseconds
  "budget_history_numsamplesvisible": (val) => true, // number of samples to draw in the budget history window.  the lower the better as far as rendering overhead of the budget panel
  "budget_history_range_ms": (val) => true, // budget history range in milliseconds
  "budget_panel_bottom_of_history_fraction": (val) => true, // number between 0 and 1
  "budget_panel_height": (val) => true, // height in pixels of the budget panel
  "budget_panel_width": (val) => true, // width in pixels of the budget panel
  "budget_panel_x": (val) => true, // number of pixels from the left side of the game screen to draw the budget panel
  "budget_panel_y": (val) => true, // number of pixels from the top side of the game screen to draw the budget panel
  "budget_peaks_window": (val) => true, // number of frames to look at when figuring out peak frametimes
  "budget_show_averages": (val) => true, // enable/disable averages in the budget panel
  "budget_show_history": (val) => true, // turn history graph off and on. . good to turn off on low end
  "budget_show_peaks": (val) => true, // enable/disable peaks in the budget panel
  "budget_toggle_group": (val) => true, // cmd turn a budget group on/off
  "bug": (val) => false, // cmd show the bug reporting ui.
  "bug_swap": (val) => false, // cmd automatically swaps the current weapon for the bug bait and back again.
  "bugreporter_console_bytes": (val) => val == 15000, // max # of console bytes to put into bug report body (full text still attached).
  "bugreporter_includebsp": (val) => val == 1, // include .bsp for internal bug submissions.
  "bugreporter_snapshot_delay": (val) => val == 15, // frames to delay before taking snapshot
  "bugreporter_uploadasync": (val) => val == 0, // upload attachments asynchronously
  "bugreporter_username": (val) => val == 0, // username to use for bugreporter
  "buildcubemaps": (val) => false, // cmd rebuild cubemaps.
  "building_cubemaps": (val) => val == 0, // indicates we're building cubemaps
  "buildmodelforworld": (val) => false, // cmd buildmodelforworld
  "c_maxdistance": (val) => val == 200, //
  "c_maxpitch": (val) => val == 90, //
  "c_maxyaw": (val) => val == 135, //
  "c_mindistance": (val) => val == 30, //
  "c_minpitch": (val) => val == 0, //
  "c_minyaw": (val) => val == -135, //
  "c_orthoheight": (val) => true, //
  "c_orthowidth": (val) => true, //
  "c_thirdpersonshoulder": (val) => true, //
  "c_thirdpersonshoulderaimdist": (val) => true, //
  "c_thirdpersonshoulderdist": (val) => true, //
  "c_thirdpersonshoulderheight": (val) => true, //
  "c_thirdpersonshoulderoffset": (val) => true, //
  "cache_print": (val) => false, // cmd cache_print [section] print out contents of cache memory.
  "cache_print_lru": (val) => false, // cmd cache_print_lru [section] print out contents of cache memory.
  "cache_print_summary": (val) => false, // cmd cache_print_summary [section] print out a summary contents of cache memory.
  "cam_collision": (val) => true, // when in thirdperson and cam_collision is set to 1, an attempt is made to keep the camera from passing though walls.
  "cam_command": (val) => false, // cmd tells camera to change modes
  "cam_idealdelta": (val) => true, // controls the speed when matching offset to ideal angles in thirdperson view
  "cam_idealdist": (val) => true, //
  "cam_idealdistright": (val) => true, //
  "cam_idealdistup": (val) => true, //
  "cam_ideallag": (val) => true, // amount of lag used when matching offset to ideal angles in thirdperson view
  "cam_idealpitch": (val) => true, //
  "cam_idealyaw": (val) => true, //
  "cam_showangles": (val) => true, // when in thirdperson, print viewangles/idealangles/cameraoffsets to the console.
  "cam_snapto": (val) => true, //
  "+camdistance": (val) => false, // cmd
  "-camdistance": (val) => false, // cmd
  "+camin": (val) => false, // cmd
  "-camin": (val) => false, // cmd
  "+cammousemove": (val) => false, // cmd
  "-cammousemove": (val) => false, // cmd
  "camortho": (val) => false, // cmd switch to orthographic camera.
  "+camout": (val) => false, // cmd
  "-camout": (val) => false, // cmd
  "+campitchdown": (val) => true, // cmd
  "-campitchdown": (val) => true, // cmd
  "+campitchup": (val) => true, // cmd
  "-campitchup": (val) => true, // cmd
  "+camyawleft": (val) => true, // cmd
  "-camyawleft": (val) => true, // cmd
  "+camyawright": (val) => true, // cmd
  "-camyawright": (val) => true, // cmd
  "cancelselect": (val) => true, // cmd
  "cast_hull": (val) => false, // cmd tests hull collision detection
  "cast_ray": (val) => false, // cmd tests collision detection
  "cast_ray_paint": (val) => false, // cmd test paint
  "catapult_physics_drag_boost": (val) => val == 2, //
  "cc_captiontrace": (val) => true, // show missing closecaptions (0 = no, 1 = devconsole, 2 = show in hud)
  "cc_emit": (val) => true, // cmd emits a closed caption
  "cc_findsound": (val) => false, // cmd searches for soundname which emits specified text.
  "cc_flush": (val) => false, // cmd flushes async'd captions.
  "cc_lang": (val) => true, // current close caption language (emtpy = use game ui language)
  "cc_linger_time": (val) => true, // close caption linger time.
  "cc_minvisibleitems": (val) => true, // minimum number of caption items to show.
  "cc_norepeat": (val) => true, // in multiplayer games, don't repeat captions more often than this many seconds.
  "cc_predisplay_time": (val) => true, // close caption delay before showing caption.
  "cc_random": (val) => false, // cmd emits a random caption
  "cc_sentencecaptionnorepeat": (val) => true, // how often a sentence can repeat.
  "cc_showblocks": (val) => false, // cmd toggles showing which blocks are pending/loaded async.
  "cc_showmissing": (val) => true, // show missing closecaption entries.
  "cc_subtitles": (val) => true, // if set, don't show sound effect captions, just voice overs (i.e., won't help hearing impaired players).
  "centerview": (val) => false, // cmd
  "ch_createairboat": (val) => false, // cmd spawn airboat in front of the player.
  "ch_createjeep": (val) => false, // cmd spawn jeep in front of the player.
  "change_portalgun_linkage_id": (val) => false, // cmd changes the portal linkage id for the portal gun held by the commanding player. give it three numbers to cycle through a range
  "changelevel": (val) => false, // cmd change server to the specified map
  "changelevel2": (val) => false, // cmd transition to the specified map in single player
  "cheap_captions_fadetime": (val) => true, //
  "cheap_captions_test": (val) => true, //
  "chet_debug_idle": (val) => val == 0, // if set one, many debug prints to help track down the tlk_idle issue. set two for super verbose info
  "choreo_spew_filter": (val) => true, // spew choreo. use a sub-string or * to display all events.
  "cl_aggregate_particles": (val) => true, //
  "cl_allowdownload": (val) => true, // client downloads customization files
  "cl_allowupload": (val) => true, // client uploads customization files
  "cl_ambient_light_disableentities": (val) => true, // disable map ambient light entities.
  "cl_anglespeedkey": (val) => val == 0, //
  "cl_auto_taunt_pip": (val) => true, //
  "cl_autowepswitch": (val) => true, // automatically switch to picked up weapons (if more powerful)
  "cl_backspeed": (val) => val >= 0 && val <= 175, //
  "cl_blobulator_freezing_max_metaball_radius": (val) => val == 12, // setting this can create more complex surfaces on large hitboxes at the cost of performance.
  "cl_blur_test": (val) => val == 0, // blurs entities that have had their photo taken
  "cl_blurclearalpha": (val) => val == 0, // 0-255, but 0 has errors at the moment
  "cl_blurdebug": (val) => val == 0, //
  "cl_blurpasses": (val) => val == 1, //
  "cl_blurtapsize": (val) => val == 0, //
  "cl_bob": (val) => true, //
  "cl_bobcycle": (val) => true, //
  "cl_bobup": (val) => true, //
  "cl_brushfastpath": (val) => true, //
  "cl_burninggibs": (val) => true, // a burning player that gibs has burning gibs.
  "cl_camera_follow_bone_index": (val) => true, // index of the bone to follow.  -2 == disabled.  -1 == root bone.  0+ is bone index.
  "cl_camera_minimal_photos": (val) => true, // draw just the targetted entity when taking a camera photo
  "cl_chat_active": (val) => true, //
  "cl_chatfilters": (val) => true, // stores the chat filter settings
  "cl_class": (val) => true, // default class when joining a game
  "cl_clearhinthistory": (val) => true, // cmd clear memory of client side hints displayed to the player.
  "cl_clock_correction": (val) => val == 1, // enable/disable clock correction on the client.
  "cl_clock_correction_adjustment_max_amount": (val) => val == 200, // sets the maximum number of milliseconds per second it is allowed to correct the client clock. it will only correct this amount
  "cl_clock_correction_adjustment_max_offset": (val) => val == 90, // as the clock offset goes from cl_clock_correction_adjustment_min_offset to this value (in milliseconds), it moves towards apply
  "cl_clock_correction_adjustment_min_offset": (val) => val == 10, // if the clock offset is less than this amount (in milliseconds), then no clock correction is applied.
  "cl_clock_correction_force_server_tick": (val) => val == 999, // force clock correction to match the server tick + this offset (-999 disables it).
  "cl_clock_showdebuginfo": (val) => val == 0, // show debugging info about the clock drift.
  "cl_clockdrift_max_ms": (val) => val == 150, // maximum number of milliseconds the clock is allowed to drift before the client snaps its clock to the server's.
  "cl_clockdrift_max_ms_threadmode": (val) => val == 0, // maximum number of milliseconds the clock is allowed to drift before the client snaps its clock to the server's.
  "cl_cloud_settings": (val) => true, // maximum number of milliseconds the clock is allowed to drift before the client snaps its clock to the server's.
  "cl_cmdrate": (val) => val == 30, // max number of command packets sent to server per second
  "cl_colorfastpath": (val) => true, //
  "cl_communitycoop_progress_throttle_rate": (val) => true, //
  "cl_coop_ping_indicator_scale": (val) => true, //
  "cl_customsounds": (val) => true, // enable customized player sound playback
  "cl_debug_paint_ammo_bar": (val) => true, //
  "cl_debugoverlaysthroughportals": (val) => true, //
  "cl_debugrumble": (val) => true, // turn on rumble debugging spew
  "cl_demoviewoverride": (val) => true, // override view during demo playback
  "cl_detail_multiplier": (val) => true, // extra details to create
  "cl_detaildist": (val) => true, // distance at which detail props are no longer visible
  "cl_detailfade": (val) => true, // distance across which detail props fade in
  "cl_disable_ragdolls": (val) => true, //
  "cl_disable_splitscreen_cpu_level_cfgs_in_pip": (val) => true, //
  "cl_disable_survey_panel": (val) => true, //
  "cl_disable_water_render_targets": (val) => true, //
  "cl_downloadfilter": (val) => true, // determines which files can be downloaded from the server (all, none, nosounds)
  "cl_draw_paint_bomb_with_blobs": (val) => val == 1, //
  "cl_draw_projected_wall_with_paint": (val) => val == 1, //
  "cl_drawhud": (val) => true, // enable the rendering of the hud
  "cl_drawleaf": (val) => val == -1, //
  "cl_drawmaterial": (val) => val == 0, // draw a particular material over the frame
  "cl_drawmonitors": (val) => val == 1, //
  "cl_drawshadowtexture": (val) => val == 0, //
  "cl_dump_particle_stats": (val) => false, // cmd dump particle profiling info to particle_profile.csv
  "cl_dumpplayer": (val) => false, // cmd dumps info about a player
  "cl_dumpsplithacks": (val) => false, // cmd dump split screen workarounds.
  "cl_ejectbrass": (val) => val == 1, //
  "cl_enable_remote_splitscreen": (val) => true, // allows viewing of nonlocal players in a split screen fashion
  "cl_energy_ball_start_fade_time": (val) => true, //
  "cl_ent_absbox": (val) => false, // cmd displays the client's absbox for the entity under the crosshair.
  "cl_ent_bbox": (val) => false, // cmd displays the client's bounding box for the entity under the crosshair.
  "cl_ent_rbox": (val) => false, // cmd displays the client's render box for the entity under the crosshair.
  "cl_entityreport": (val) => val == 0, // for debugging, draw entity states to console
  "cl_extrapolate": (val) => val == 1, // enable/disable extrapolation if interpolation history runs out.
  "cl_extrapolate_amount": (val) => val == 0, // set how many seconds the client will extrapolate entities for.
  "cl_fastdetailsprites": (val) => true, // whether to use new detail sprite system
  "cl_fasttempentcollision": (val) => val == 5, //
  "cl_find_ent": (val) => false, // cmd find and list all client entities with classnames that contain the specified substring. format: cl_find_ent <substring>
  "cl_find_ent_index": (val) => false, // cmd display data for clientside entity matching specified index. format: cl_find_ent_index <index>
  "cl_flushentitypacket": (val) => val == 0, // for debugging. force the engine to flush an entity packet.
  "cl_footer_no_auto_shrink": (val) => true, // prevents shrinking the font when it would wrap.
  "cl_footer_no_auto_wrap": (val) => true, // prevents shrinking the font when it would wrap.
  "cl_forcepreload": (val) => true, // whether we should force preloading.
  "cl_forwardspeed": (val) => val >= 0 && val <= 175, //
  "cl_foundry_showentityhighlights": (val) => val == 1, //
  "cl_fov": (val) => val >= 45 && val <= 140, //  client-side fov control that is global for all splitscreen players on this machine.  this gets overriden via splitscreen_config
  "cl_fullupdate": (val) => false, // cmd forces the server to send a full update packet
  "cl_group_paint_impact_effects": (val) => true, //
  "cl_idealpitchscale": (val) => true, //
  "cl_ignore_vpk_assocation": (val) => val == 0, // do not ask to set vpk assocation
  "cl_ignorepackets": (val) => val == 0, // force client to ignore packets (for debugging).
  "cl_interp": (val) => true, // sets the interpolation amount (bounded on low side by server interp ratio settings).
  "cl_interp_all": (val) => true, // disable interpolation list optimizations.
  "cl_interp_npcs": (val) => true, // interpolate npc positions starting this many seconds in past (or cl_interp, if greater)
  "cl_interp_ratio": (val) => true, // sets the interpolation amount (final amount is cl_interp_ratio / cl_updaterate).
  "cl_jiggle_bone_debug": (val) => val == 0, // display physics-based 'jiggle bone' debugging information
  "cl_jiggle_bone_debug_pitch_constraints": (val) => val == 0, // display physics-based 'jiggle bone' debugging information
  "cl_jiggle_bone_debug_yaw_constraints": (val) => val == 0, // display physics-based 'jiggle bone' debugging information
  "cl_jiggle_bone_invert": (val) => val == 0, //
  "cl_jiggle_bone_sanity": (val) => val == 1, // prevent jiggle bones from pointing directly away from their target in case of numerical instability.
  "cl_lagcomp_errorcheck": (val) => val == 0, // player index of other player to check for position errors.
  "cl_lagcompensation": (val) => val == 1, // perform server side lag compensation of weapon firing events.
  "cl_language": (val) => true, // language (from steam api)
  "cl_leafsystemvis": (val) => val == 0, //
  "cl_leveloverview": (val) => val == 0, //
  "cl_leveloverviewmarker": (val) => val == 0, //
  "cl_localnetworkbackdoor": (val) => val == 1, // enable network optimizations for single player games.
  "cl_logofile": (val) => true, // spraypoint logo decal.
  "cl_maxrenderable_dist": (val) => val == 3000, // max distance from the camera at which things will be rendered
  "cl_minimal_rtt_shadows": (val) => true, //
  "cl_modelfastpath": (val) => true, //
  "cl_modemanager_reload": (val) => false, // cmd reloads the panel metaclasses for vgui screens.
  "cl_mouseenable": (val) => true, //
  "cl_mouselook": (val) => true, // set to 1 to use mouse for look, 0 for keyboard look. cannot be set while connected to a server.
  "cl_mouselook2": (val) => true, // set to 1 to use mouse for look, 0 for keyboard look. cannot be set while connected to a server.
  "cl_mouselook_roll_compensation": (val) => true, // in portal and paint, if your view is being rolled, compensate for that. so mouse movements are always relative to the screen.
  "cl_npc_speedmod_intime": (val) => val == 0, //
  "cl_npc_speedmod_outtime": (val) => val == 1, //
  "cl_observercrosshair": (val) => val == 1, //
  "cl_overdraw_test": (val) => val == 0, //
  "cl_paintable_projected_wall_texture_wrap_rate": (val) => val == 64, //
  "cl_panelanimation": (val) => false, // cmd shows panel animation variables: <panelname | blank for all panels>.
  "cl_particle_batch_mode": (val) => true, //
  "cl_particle_fallback_base": (val) => true, // base for falling back to cheaper effects under load.
  "cl_particle_fallback_multiplier": (val) => true, // multiplier for falling back to cheaper effects under load.
  "cl_particle_max_count": (val) => true, //
  "cl_particle_retire_cost": (val) => true, //
  "cl_particle_sim_fallback_base_multiplier": (val) => true, // how aggressive the switch to fallbacks will be depending on how far over the cl_particle_sim_fallback_threshold_ms the sim time
  "cl_particle_sim_fallback_threshold_ms": (val) => true, // amount of simulation time that can elapse before new systems start falling back to cheaper versions
  "cl_particles_dump_effects": (val) => false, // cmd
  "cl_particles_dumplist": (val) => false, // cmd dump all new particles, optional name substring.
  "cl_particles_show_bbox": (val) => val == 0, //
  "cl_particles_show_controlpoints": (val) => val == 0, //
  "cl_pclass": (val) => val == 0, // dump entity by prediction classname.
  "cl_pdump": (val) => val == -1, // dump info about this entity to screen.
  "cl_photo_disable_model_alpha_writes": (val) => val == 1, // disallows the target entity in photos from writing to the photo's alpha channel
  "cl_phys_block_dist": (val) => val == 1, //
  "cl_phys_block_fraction": (val) => val == 0, //
  "cl_phys_maxticks": (val) => true, // sets the max number of physics ticks allowed for client-side physics (ragdolls)
  "cl_phys_show_active": (val) => val == 0, //
  "cl_phys_timescale": (val) => true, // sets the scale of time for client-side physics (ragdolls)
  "cl_physicsshadowupdate_render": (val) => val == 0, //
  "cl_pitchdown": (val) => true, //
  "cl_pitchspeed": (val) => true, //
  "cl_pitchup": (val) => true, //
  "cl_playback_screenshots": (val) => true, // allows the client to playback screenshot and jpeg commands in demos.
  "cl_player_fullupdate_predicted_origin_fix": (val) => val == 1, //
  "cl_playermodel": (val) => true, // default player model
  "cl_playerspraydisable": (val) => true, // disable player sprays.
  "cl_portal_camera_orientation_acceleration_rate": (val) => val == 1000, //
  "cl_portal_camera_orientation_max_speed": (val) => val == 375, //
  "cl_portal_camera_orientation_rate": (val) => val == 480, //
  "cl_portal_camera_orientation_rate_base": (val) => val == 45, //
  "cl_portal_ghost_use_render_bound": (val) => true, //
  "cl_portal_projectile_delay_mp": (val) => val == 0, //
  "cl_portal_projectile_delay_sp": (val) => val == 0, //
  "cl_portal_teleportation_interpolation_fixup_method": (val) => val == 1, // 0 = transform history only, 1 = insert discontinuity transform
  "cl_portal_use_new_dissolve": (val) => true, // use new dissolve effect
  "cl_portalgun_beam_size": (val) => true, //
  "cl_portalgun_effects_max_alpha": (val) => true, //
  "cl_portalgun_effects_min_alpha": (val) => true, //
  "cl_portalgun_effects_min_size": (val) => true, //
  "cl_precacheinfo": (val) => false, // cmd show precache info (client).
  "cl_pred_doresetlatch": (val) => val == 1, //
  "cl_pred_error_verbose": (val) => true, // show more field info when spewing prediction errors.
  "cl_pred_optimize": (val) => val == 2, // optimize for not copying data if didn't receive a network update (1), and also for not repredicting if there were no errors (2)
  "cl_pred_track": (val) => false, // cmd <entindex> <fieldname>:  track changes to entity index entindex, for field fieldname.
  "cl_predict": (val) => val == 0, // perform client side prediction.
  "cl_predict_basetoggles": (val) => val == 1, //
  "cl_predict_catapults": (val) => val == 1, //
  "cl_predict_motioncontrol": (val) => val == 0, //
  "cl_predict_portal_placement": (val) => val == 1, // controls whether we attempt to compensate for lag by predicting portal placement on the client when playing multiplayer.
  "cl_predict_projected_entities": (val) => val == 1, //
  "cl_predicted_movement_uses_uninterpolated_physics": (val) => val == 1, //
  "cl_prediction_error_timestamps": (val) => true, //
  "cl_predictioncopy_describe": (val) => false, // cmd describe datamap_t for entindex
  "cl_predictionlist": (val) => val == 0, // show which entities are predicting
  "cl_predictphysics": (val) => val == 0, // use a prediction-friendly physics interface on the client
  "cl_predictweapons": (val) => val == 1, // perform client side prediction of weapon effects.
  "cl_projected_wall_projection_speed": (val) => true, //
  "cl_projectedbridge_aabbhack": (val) => val == 0, // when predicting projected bridges, the spatial partition aabb encompasses all aabb's for outstanding collideables
  "cl_quick_join_panel_accel": (val) => true, // acceleration for the y position of the panel when items are added or removed.
  "cl_quick_join_panel_fakecount": (val) => true, //
  "cl_quick_join_panel_tall": (val) => true, // the spacing between panels.
  "cl_quick_join_scroll_max": (val) => true, // max players shown in the friend scrolling ticker.
  "cl_quick_join_scroll_offset": (val) => true, // offset of the friend scrolling ticker from the title.
  "cl_quick_join_scroll_rate": (val) => true, // rate of the friend scrolling ticker.
  "cl_quick_join_scroll_start": (val) => true, // number of players available to start friend scrolling ticker.
  "cl_race_checkpoint_active_color": (val) => true, //
  "cl_race_checkpoint_inactive_color": (val) => true, //
  "cl_ragdoll_collide": (val) => true, //
  "cl_ragdoll_gravity": (val) => true, // sets the gravity client-side ragdolls
  "cl_removedecals": (val) => false, // cmd remove the decals from the entity under the crosshair.
  "cl_report_soundpatch": (val) => false, // cmd reports client-side sound patch count
  "cl_resend": (val) => true, // delay in seconds before the client will resend the 'connect' attempt
  "cl_resend_timeout": (val) => true, // total time allowed for the client to resend the 'connect' attempt
  "cl_resetportalledplayerinterp": (val) => val == 0, //
  "cl_retire_low_priority_lights": (val) => true, // low priority dlights are replaced by high priority ones
  "cl_rosette_debug": (val) => val == 0, //
  "cl_rosette_gamepad_expand_time": (val) => val == 0, //
  "cl_rosette_gamepad_lockin_time": (val) => val == 0, //
  "cl_rosette_line_inner_radius": (val) => val == 25, //
  "cl_rosette_line_outer_radius": (val) => val == 45, //
  "cl_rumblescale": (val) => true, // scale sensitivity of rumble effects (0 to 1.0)
  "cl_rumblescale2": (val) => true, // scale sensitivity of rumble effects (0 to 1.0)
  "cl_screenshotname": (val) => true, // custom screenshot name
  "cl_setupallbones": (val) => val == 0, //
  "cl_shadowtextureoverlaysize": (val) => true, //
  "cl_shadowupdatespacing": (val) => true, //
  "cl_show_bounds_errors": (val) => val == 0, //
  "cl_show_splashes": (val) => val == 1, //
  "cl_showanimstate_activities": (val) => val == 1, // show activities in the (client) animation state display.
  "cl_showbackpackrarities": (val) => val == 0, // show item rarities within the backpack.
  "cl_showbonesetupents": (val) => val == 0, // show which entities are having their bones setup each frame.
  "cl_showcomplexfrustum": (val) => val == 0, //
  "cl_showdemooverlay": (val) => true, // how often to flash demo recording/playback overlay (0 - disable overlay, -1 - show always)
  "cl_showents": (val) => false, // cmd dump entity list to console.
  "cl_showerror": (val) => val == 0, // show prediction errors, 2 for above plus detailed field deltas.
  "cl_showevents": (val) => val == 0, // print event firing info in the console
  "cl_showfps": (val) => true, // draw fps meter (1 = fps, 2 = smooth, 3 = server, 4 = show+logtofile, +10 = detailed )
  "cl_showhelp": (val) => true, // set to 0 to not show on-screen help
  "cl_showpausedimage": (val) => true, // show the 'paused' image when game is paused.
  "cl_showpluginmessages": (val) => true, // allow plugins to display messages to you
  "cl_showpos": (val) => val == 0 || val == 1, //  draw current position at top of screen
  "cl_showsunvectors": (val) => val == 0, //
  "cl_showtextmsg": (val) => true, // enable/disable text messages printing on the screen.
  "cl_sidespeed": (val) => val >= 0 && val <= 175, //
  "cl_simdbones": (val) => val == 0, // use simd bone setup.
  "cl_skip_player_render_in_main_view": (val) => true, //
  "cl_skipfastpath": (val) => val == 0, // set to 1 to stop all models that go through the model fast path from rendering
  "cl_skipslowpath": (val) => val == 0, // set to 1 to skip any models that don't go through the model fast path
  "cl_smooth": (val) => val == 1, // smooth view/eye origin after prediction errors
  "cl_smoothtime": (val) => val == 0, // smooth client's view after prediction error over this many seconds
  "cl_sos_test_get_opvar": (val) => false, // cmd
  "cl_sos_test_set_opvar": (val) => false, // cmd
  "cl_soundemitter_flush": (val) => false, // cmd flushes the sounds.txt system (server only)
  "cl_soundemitter_reload": (val) => false, // cmd flushes the sounds.txt system
  "cl_soundfile": (val) => true, // jingle sound file.
  "cl_soundscape_flush": (val) => false, // cmd flushes the client side soundscapes
  "cl_soundscape_printdebuginfo": (val) => false, // cmd print soundscapes
  "cl_spec_mode": (val) => val == 1, // spectator mode
  "cl_spewscriptintro": (val) => val == 0, //
  "cl_sporeclipdistance": (val) => val == 512, //
  "cl_ss_origin": (val) => false, // cmd print origin in script format
  "cl_sun_decay_rate": (val) => true, //
  "cl_sunlight_depthbias": (val) => true, //
  "cl_sunlight_ortho_size": (val) => true, // set to values greater than 0 for ortho view render projections.
  "cl_support_vpk_assocation": (val) => val == 0, // whether vpk associations are enabled for this mod
  "cl_survey_panel_dont_submit_answers": (val) => val == 0, //
  "cl_taunt_finish_rotate_cam": (val) => true, //
  "cl_taunt_finish_speed": (val) => true, //
  "cl_team": (val) => true, // default team when joining a game
  "cl_threaded_bone_setup": (val) => val == 0, // enable parallel processing of c_baseanimating::setupbones()
  "cl_threaded_init": (val) => val == 0, //
  "cl_timeout": (val) => true, // after this many seconds without receiving a packet from the server, the client will disconnect itself
  "cl_tlucfastpath": (val) => val == 1, //
  "cl_tracer_whiz_distance": (val) => val == 72, //
  "cl_tree_sway_dir": (val) => false, // cmd sets tree sway wind direction and strength
  "cl_updaterate": (val) => val == 20, // number of packets per second of updates you are requesting from the server
  "cl_updatevisibility": (val) => false, // cmd updates visibility bits.
  "cl_upspeed": (val) => val == 320, //
  "cl_use_simd_bones": (val) => val == 1, // 1 use simd bones 0 use scalar bones.
  "cl_useoldswapportalvisibilitycode": (val) => val == 0, //
  "cl_vertical_elevator_fix": (val) => val == 1, //
  "cl_view": (val) => false, // cmd set the view entity index.
  "cl_viewmodelsclonedasworld": (val) => val == 1, //
  "cl_voice_filter": (val) => true, // filter voice by name substring
  "cl_winddir": (val) => true, // weather effects wind direction angle
  "cl_windspeed": (val) => true, // weather effects wind speed scalar
  "cl_wpn_sway_interp": (val) => true, //
  "cl_wpn_sway_scale": (val) => true, //
  "cl_yawspeed": (val) => true, //
  "clear": (val) => true, // cmd clear all console output.
  "clear_anim_cache": (val) => true, // cmd clears the animation cache, freeing the memory (until the next time a streaming animblock is requested).
  "clear_debug_overlays": (val) => true, // cmd clears debug overlays
  "clientport": (val) => true, // host game client port
  "closecaption": (val) => true, // enable close captioning.
  "cm_community_debug_spew": (val) => val == 0, //
  "cm_filter_quickplay_with_history": (val) => val == 1, // tells the client if it should filter maps in quickplay mode with history queue.
  "cm_fix_orphaned_files": (val) => val == 0, //
  "cm_open_vote_dialog": (val) => false, // cmd opens the map voting dialog for testing purposes
  "cm_play_intro_video": (val) => val == 0, //
  "cm_reset_vo_progress": (val) => true, // cmd reset the progress of the peti storyline.
  "cmd": (val) => cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")), //cmd  forward command to server.
  "cmd1": (val) => cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")), //cmd  sets userinfo string for split screen player in slot 1
  "cmd2": (val) => cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")), //cmd  sets userinfo string for split screen player in slot 2
  "cmd3": (val) => cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")), //cmd  sets userinfo string for split screen player in slot 3
  "cmd4": (val) => cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")), //cmd  sets userinfo string for split screen player in slot 4
  "collision_shake_amp": (val) => val == 0, //
  "collision_shake_freq": (val) => val == 0, //
  "collision_shake_time": (val) => val == 0, //
  "collision_test": (val) => false, // cmd tests collision system
  "colorcorrectionui": (val) => false, // cmd show/hide the color correction tools ui.
  "+commandermousemove": (val) => false, // cmd
  "-commandermousemove": (val) => false, // cmd
  "commentary": (val) => val == 0, // desired commentary mode state.
  "commentary_available": (val) => true, // automatically set by the game when a commentary file is available for the current map.
  "commentary_cvarsnotchanging": (val) => false, // cmd
  "commentary_finishnode": (val) => false, // cmd
  "commentary_showmodelviewer": (val) => false, // cmd display the commentary model viewer. usage: commentary_showmodelviewer <model name> <optional attached model name>
  "con_drawnotify": (val) => true, // disables drawing of notification area (for taking screenshots).
  "con_enable": (val) => true, // allows the console to be activated.
  "con_filter_enable": (val) => true, // filters console output based on the setting of con_filter_text. 1 filters completely, 2 displays filtered text brighter than ot
  "con_filter_text": (val) => true, // text with which to filter console spew. set con_filter_enable 1 or 2 to activate.
  "con_filter_text_out": (val) => true, // text with which to filter out of console spew. set con_filter_enable 1 or 2 to activate.
  "con_logfile": (val) => true, // console output gets written to this file
  "con_notifytime": (val) => true, // how long to display recent console text to the upper part of the game window
  "con_nprint_bgalpha": (val) => true, // con_nprint background alpha.
  "con_nprint_bgborder": (val) => true, // con_nprint border size.
  "con_timestamp": (val) => true, // prefix console.log entries with timestamps
  "con_trace": (val) => true, // print console text to low level printout.
  "condump": (val) => true, // cmd dump the text currently in the console to condumpxx.log
  "connect": (val) => false, // cmd connect to specified server.
  "contimes": (val) => true, // number of console lines to overlay for debugging.
  "coop": (val) => true, // cooperative play.
  "coop_impact_velocity_threshold": (val) => val == 250, //
  "+coop_ping": (val) => true, // cmd
  "-coop_ping": (val) => true, // cmd
  "cpu_level": (val) => true, // cpu level - default: high
  "crash": (val) => false, // cmd cause the engine to crash (debug!!)
  "create_flashlight": (val) => false, // cmd
  "creditsdone": (val) => false, // cmd
  "crosshair": (val) => true, //
  "curve_bias": (val) => val == 0, //
  "cvarlist": (val) => false, // cmd show the list of convars/concommands.
  "das_max_z_trace_length": (val) => val == 100000, // maximum height of player and still test for adsp
  "das_process_overhang_spaces": (val) => val == 1, //
  "datacachesize": (val) => true, // size in mb.
  "dbg_demofile": (val) => val == 0, //
  "dbghist_addline": (val) => false, // cmd add a line to the debug history. format: <category id> <line>
  "dbghist_dump": (val) => false, // cmd dump the debug history to the console. format: <category id>     categories:      0: entity i/o      1: ai decisions      2: sc
  "deathmatch": (val) => val == 0, // running a deathmatch server.
  "debug_fixmyposition": (val) => false, // cmd runs findsclosestpassablespace() on player.
  "debug_materialmodifycontrol": (val) => val == 0, //
  "debug_materialmodifycontrol_client": (val) => val == 0, //
  "debug_mouse": (val) => val == 20, //
  "debug_overlay_fullposition": (val) => val == 0, //
  "debug_paint_client_blobs": (val) => val == 0, //
  "debug_paint_impact_effects": (val) => val == 0, //
  "debug_paint_sprayer_cone": (val) => val == 0, //
  "debug_paintable_projected_wall": (val) => val == 0, //
  "debug_paintbomb_explosion": (val) => val == 0, //
  "debug_physimpact": (val) => val == 0, //
  "debug_pitch_limit": (val) => val == 0, //
  "debug_player_paint_shoot_pos": (val) => val == 0, //
  "debug_projected_wall_drawing": (val) => val == 0, //
  "debug_touchlinks": (val) => val == 0, // spew touch link activity
  "debug_viewmodel_grabcontroller": (val) => val == 0, //
  "debug_visibility_monitor": (val) => val == 0, //
  "debugportalcollideables": (val) => false, // cmd dump all cphyscollides for all portals to the debug overlay
  "debugsystemui": (val) => false, // cmd show/hide the debug system ui.
  "decalfrequency": (val) => true, //
  "default_fov": (val) => val >= 45 && val <= 140, //
  "demo_avellimit": (val) => true, // angular velocity limit before eyes considered snapped for demo playback.
  "demo_debug": (val) => true, // demo debug info.
  "demo_enabledemos": (val) => true, // enable recording demos (must be set true before loading a map)
  "demo_fastforwardfinalspeed": (val) => true, // go this fast when starting to hold ff button.
  "demo_fastforwardramptime": (val) => true, // how many seconds it takes to get to full ff speed.
  "demo_fastforwardstartspeed": (val) => true, // go this fast when starting to hold ff button.
  "demo_gototick": (val) => false, // cmd skips to a tick in demo.
  "demo_interplimit": (val) => true, // how much origin velocity before it's considered to have 'teleported' causing interpolation to reset.
  "demo_interpolateview": (val) => true, // do view interpolation during dem playback.
  "demo_legacy_rollback": (val) => true, // use legacy view interpolation rollback amount in demo playback.
  "demo_pause": (val) => false, // cmd pauses demo playback.
  "demo_pauseatservertick": (val) => true, // pauses demo playback at server tick
  "demo_quitafterplayback": (val) => true, // quits game after demo playback.
  "demo_recordcommands": (val) => true, // record commands typed at console into .dem files.
  "demo_resume": (val) => false, // cmd resumes demo playback.
  "demo_timescale": (val) => false, // cmd sets demo replay speed.
  "demo_togglepause": (val) => false, // cmd toggles demo playback.
  "demolist": (val) => false, // cmd print demo sequence list.
  "demos": (val) => false, // cmd demo demo file sequence.
  "demoui": (val) => false, // cmd show/hide the demo player ui.
  "demoui2": (val) => false, // cmd show/hide the advanced demo player ui (demoui2).
  "+demoui2": (val) => false, // cmd bring the advanced demo player ui (demoui2) to foreground.
  "-demoui2": (val) => false, // cmd send the advanced demo player ui (demoui2) to background.
  "developer": (val) => val == 0 || val == 1, //  set developer message level
  "devshots_nextmap": (val) => false, // cmd used by the devshots system to go to the next map in the devshots maplist.
  "devshots_screenshot": (val) => false, // cmd used by the -makedevshots system to take a screenshot. for taking your own screenshots, use the 'screenshot' command instead.
  "differences": (val) => false, // cmd show all convars which are not at their default values.
  "disable_static_prop_loading": (val) => val == 0, // if non-zero when a map loads, static props won't be loaded
  "disconnect": (val) => false, // cmd disconnect game from server.
  "disp_dynamic": (val) => val == 0, //
  "disp_list_all_collideable": (val) => false, // cmd list all collideable displacements
  "dispcoll_drawplane": (val) => val == 0, //
  "display_elapsedtime": (val) => false, // cmd displays how much time has elapsed since the game started
  "display_game_events": (val) => val == 0, //
  "displayportalplayerstats": (val) => false, // cmd displays current level stats for portals placed, steps taken, and seconds taken.
  "displaysoundlist": (val) => val == 0, //
  "dlight_debug": (val) => false, // cmd creates a dlight in front of the player
  "draw_paint_client_blobs": (val) => val == 0, //
  "draw_paint_isosurface": (val) => val == 1, //
  "draw_paint_splat_particles": (val) => val == 1, //
  "drawcross": (val) => false, // cmd draws a cross at the given location  arguments: x y z
  "drawline": (val) => false, // cmd draws line between two 3d points.  green if no collision  red is collides with something  arguments: x1 y1 z1 x2 y2 z2
  "dropprimary": (val) => false, // cmd dropprimary: drops the primary weapon of the player.
  "dsp_automatic": (val) => true, //
  "dsp_db_min": (val) => true, //
  "dsp_db_mixdrop": (val) => true, //
  "dsp_dist_max": (val) => true, //
  "dsp_dist_min": (val) => true, //
  "dsp_enhance_stereo": (val) => true, //
  "dsp_facingaway": (val) => true, //
  "dsp_mix_max": (val) => true, //
  "dsp_mix_min": (val) => true, //
  "dsp_off": (val) => true, //
  "dsp_player": (val) => true, //
  "dsp_reload": (val) => false, // cmd
  "dsp_room": (val) => true, //
  "dsp_slow_cpu": (val) => true, //
  "dsp_spatial": (val) => true, //
  "dsp_speaker": (val) => true, //
  "dsp_vol_2ch": (val) => true, //
  "dsp_vol_4ch": (val) => true, //
  "dsp_vol_5ch": (val) => true, //
  "dsp_volume": (val) => true, //
  "dsp_water": (val) => true, //
  "dt_showpartialchangeents": (val) => val == 0, // (sp only) - show entities that were copied using small optimized lists (fl_edict_partial_change).
  "dt_usepartialchangeents": (val) => val == 1, // (sp only) - enable fl_edict_partial_change optimization.
  "dti_flush": (val) => false, // cmd write out the datatable instrumentation files (you must run with -dti for this to work).
  "dtwarning": (val) => true, // print data table warnings?
  "dtwatchclass": (val) => true, // watch all fields encoded with this table.
  "dtwatchdecode": (val) => true, // when watching show decode.
  "dtwatchencode": (val) => true, // when watching show encode.
  "dtwatchent": (val) => true, // watch this entities data table encoding.
  "dtwatchvar": (val) => true, // watch the named variable.
  "+duck": (val) => true, // cmd
  "-duck": (val) => true, // cmd
  "dump_entity_sizes": (val) => false, // cmd print sizeof(entclass)
  "dump_globals": (val) => false, // cmd dump all global entities/states
  "dump_particlemanifest": (val) => false, // cmd dump the list of particles loaded.
  "dumpentityfactories": (val) => false, // cmd lists all entity factory names.
  "dumpeventqueue": (val) => false, // cmd dump the contents of the entity i/o event queue to the console.
  "dumpgamestringtable": (val) => false, // cmd dump the contents of the game string table to the console.
  "dumpstringtables": (val) => false, // cmd print string tables to console.
  "echo": (val) => true, // cmd echo text to console.
  "editdemo": (val) => false, // cmd edit a recorded demo file (.dem ).
  "editor_toggle": (val) => false, // cmd disables the simulation and returns focus to the editor
  "enable_debug_overlays": (val) => true, // enable rendering of debug overlays
  "enable_skeleton_draw": (val) => true, // render skeletons in wireframe
  "endmovie": (val) => false, // cmd stop recording movie frames.
  "english": (val) => true, // if set to 1, running the english language set of assets.
  "ent_absbox": (val) => false, // cmd displays the total bounding box for the given entity(s) in green.  some entites will also display entity specific overlays.  ar
  "ent_attachments": (val) => false, // cmd displays the attachment points on an entity.  arguments:    {entity_name} / {class_name} / no argument picks what player is loo
  "ent_autoaim": (val) => false, // cmd displays the entity's autoaim radius.  arguments:    {entity_name} / {class_name} / no argument picks what player is looking at
  "ent_bbox": (val) => false, // cmd displays the movement bounding box for the given entity(ies) in orange.  some entites will also display entity specific overlay
  "ent_cancelpendingentfires": (val) => false, // cmd cancels all ent_fire created outputs that are currently waiting for their delay to expire.
  "ent_create": (val) => false, // cmd creates an entity of the given type where the player is looking.
  "ent_create_paint_bomb_erase": (val) => false, // cmd creates a paint bomb with the erase paint paint power
  "ent_create_paint_bomb_jump": (val) => false, // cmd creates a paint bomb with the jump paint paint power
  "ent_create_paint_bomb_portal": (val) => false, // cmd creates a paint bomb with the portal paint paint power
  "ent_create_paint_bomb_speed": (val) => false, // cmd creates a paint bomb with the speed paint paint power
  "ent_create_portal_companion_cube": (val) => false, // cmd creates a companion cube where the player is looking.
  "ent_create_portal_reflector_cube": (val) => false, // cmd creates a laser reflector cube cube where the player is looking.
  "ent_create_portal_weighted_antique": (val) => false, // cmd creates an antique cube where the player is looking.
  "ent_create_portal_weighted_cube": (val) => false, // cmd creates a standard cube where the player is looking.
  "ent_create_portal_weighted_sphere": (val) => false, // cmd creates a weighted sphere where the player is looking.
  "ent_debugkeys": (val) => val == 0, //
  "ent_dump": (val) => false, // cmd usage:    ent_dump <entity name>
  "ent_fire": (val) => false, // cmd usage:    ent_fire <target> [action] [value] [delay]
  "ent_info": (val) => false, // cmd usage:    ent_info <class name>
  "ent_keyvalue": (val) => false, // cmd applies the comma delimited key=value pairs to the entity with the given hammer id.  format: ent_keyvalue <entity id> <key1>=<v
  "ent_messages": (val) => false, // cmd toggles input/output message display for the selected entity(ies).  the name of the entity will be displayed as well as any mes
  "ent_messages_draw": (val) => val == 0, // visualizes all entity input/output activity.
  "ent_name": (val) => false, // cmd
  "ent_orient": (val) => false, // cmd orient the specified entity to match the player's angles. by default, only orients target entity's yaw. use the 'allangles' opt
  "ent_pause": (val) => false, // cmd toggles pausing of input/output message processing for entities.  when turned on processing of all message will stop.  any mess
  "ent_pivot": (val) => false, // cmd displays the pivot for the given entity(ies).  (y=up=green, z=forward=blue, x=left=red).   arguments:    {entity_name} / {class
  "ent_rbox": (val) => false, // cmd displays the total bounding box for the given entity(s) in green.  some entites will also display entity specific overlays.  ar
  "ent_remove": (val) => false, // cmd removes the given entity(s)  arguments:    {entity_name} / {class_name} / no argument picks what player is looking at
  "ent_remove_all": (val) => false, // cmd removes all entities of the specified type  arguments:    {entity_name} / {class_name}
  "ent_rotate": (val) => false, // cmd rotates an entity by a specified # of degrees
  "ent_script_dump": (val) => false, // cmd dumps the names and values of this entity's script scope to the console  arguments:    {entity_name} / {class_name} / no argume
  "ent_setang": (val) => false, // cmd set entity angles
  "ent_setname": (val) => false, // cmd sets the targetname of the given entity(s)  arguments:    {new entity name} {entity_name} / {class_name} / no argument picks wh
  "ent_setpos": (val) => false, // cmd move entity to position
  "ent_show_contexts": (val) => val == 0, // show entity contexts in ent_text display
  "ent_show_response_criteria": (val) => false, // cmd print, to the console, an entity's current criteria set used to select responses.  arguments:    {entity_name} / {class_name} /
  "ent_step": (val) => false, // cmd when 'ent_pause' is set this will step through one waiting input / output message at a time.
  "ent_teleport": (val) => false, // cmd teleport the specified entity to where the player is looking.  format: ent_teleport <entity name>
  "ent_text": (val) => false, // cmd displays text debugging information about the given entity(ies) on top of the entity (see overlay text)  arguments:    {entity_
  "ent_viewoffset": (val) => false, // cmd displays the eye position for the given entity(ies) in red.  arguments:    {entity_name} / {class_name} / no argument picks wha
  "envmap": (val) => false, // cmd
  "er_colwidth": (val) => true, //
  "er_graphwidthfrac": (val) => true, //
  "er_maxname": (val) => true, //
  "erase_color": (val) => true, // color for erase
  "erase_visual_color": (val) => true, // color for erase that is rendered
  "escape": (val) => true, // cmd escape key pressed.
  "exec": (val) => true, // cmd execute script file.
  "execifexists": (val) => true, // cmd execute script file if file exists.
  "exit": (val) => false, // cmd exit the engine.
  "explode": (val) => false, // cmd kills the player with explosive damage
  "explodevector": (val) => false, // cmd kills a player applying an explosive force. usage: explodevector <player> <x value> <y value> <z value>
  "exploding_futbol_end_color": (val) => true, // the ending color of the exploding futbol, before it starts the final explode sequence.
  "exploding_futbol_explode_on_fizzle": (val) => val == 0, // if the exploding futbol should explode when it fizzles.
  "exploding_futbol_explosion_damage": (val) => val == 25, // the damage of the explosion for the exploding futbol.
  "exploding_futbol_explosion_damage_falloff": (val) => val == 0, // the percentage of damage taken at the edge of the explosion.
  "exploding_futbol_explosion_debug": (val) => val == 0, // debug the explosion of the exploding futbol.
  "exploding_futbol_explosion_magnitude": (val) => val == 0, // the magnitude of the explosion for the exploding futbol.
  "exploding_futbol_explosion_radius": (val) => val == 200, // the radius of the explosion for the exploding futbol.
  "exploding_futbol_flash_duration": (val) => val == 1, // the flash duration of the exploding futbol, right before it explodes.
  "exploding_futbol_flash_end_color": (val) => true, // the final color of the exploding futbol, right before it explodes.
  "exploding_futbol_flash_start_color": (val) => true, // the start color for the futbol flashing before it explodes.
  "exploding_futbol_flash_start_time": (val) => val == 3, // the time before the futbol explodes when it start to flash.
  "exploding_futbol_hit_breakables": (val) => val == 1, // if the exploding futbol should hit breakable entities.
  "exploding_futbol_phys_mag": (val) => val == 100, // magnitude of physics force for an exploding futbol
  "exploding_futbol_phys_rad": (val) => val == 45, // magnitude of physics force for an exploding futbol
  "exploding_futbol_physics_punt_player": (val) => val == 1, // physically perturb the player when the explosion hits them
  "exploding_futbol_start_color": (val) => true, // the starting color of the exploding futbol.
  "exploding_futbol_use_cooldown_time": (val) => val == 0, // the cooldown time for the use key after the player picks up the futbol.
  "fadein": (val) => false, // cmd fadein {time r g b}: fades the screen in from black or from the specified color over the given number of seconds.
  "fadeout": (val) => false, // cmd fadeout {time r g b}: fades the screen to black or to the specified color over the given number of seconds.
  "fast_fogvolume": (val) => val == 0, //
  "fast_poly_convert": (val) => val == 1, //
  "fast_teleport_enable": (val) => val == 1, //
  "filesystem_buffer_size": (val) => true, // size of per file buffers. 0 for none
  "filesystem_max_stdio_read": (val) => true, //
  "filesystem_native": (val) => true, // use native fs or stdio
  "filesystem_report_buffered_io": (val) => true, //
  "filesystem_unbuffered_io": (val) => true, //
  "filesystem_use_overlapped_io": (val) => true, //
  "find": (val) => false, // cmd find concommands with the specified string in their name/help text.
  "find_ent": (val) => false, // cmd find and list all entities with classnames or targetnames that contain the specified substring. format: find_ent <substring>
  "find_ent_index": (val) => false, // cmd display data for entity matching specified index. format: find_ent_index <index>
  "findflags": (val) => false, // cmd find concommands by flags.
  "fire_absorbrate": (val) => val == 3, //
  "fire_dmgbase": (val) => val == 1, //
  "fire_dmginterval": (val) => val == 1, //
  "fire_dmgscale": (val) => val == 0, //
  "fire_energy_ball": (val) => false, // cmd fires a test energy ball out of your face
  "fire_extabsorb": (val) => val == 5, //
  "fire_extscale": (val) => val == 12, //
  "fire_growthrate": (val) => val == 1, //
  "fire_heatscale": (val) => val == 1, //
  "fire_incomingheatscale": (val) => val == 0, //
  "fire_maxabsorb": (val) => val == 50, //
  "fire_rocket_projectile": (val) => false, // cmd fires a rocket turret projectile from the player's eyes for testing.
  "firetarget": (val) => false, // cmd
  "firstperson": (val) => false, // cmd switch to firstperson camera.
  "fish_debug": (val) => val == 0, // show debug info for fish
  "fish_dormant": (val) => val == 0, // turns off interactive fish behavior. fish become immobile and unresponsive.
  "flex_expression": (val) => val == 0, //
  "flex_looktime": (val) => val == 5, //
  "flex_maxawaytime": (val) => val == 1, //
  "flex_maxplayertime": (val) => val == 7, //
  "flex_minawaytime": (val) => val == 0, //
  "flex_minplayertime": (val) => val == 5, //
  "flex_rules": (val) => val == 1, // allow flex animation rules to run.
  "flex_smooth": (val) => val == 1, // applies smoothing/decay curve to flex animation controller changes.
  "flex_talk": (val) => val == 0, //
  "flush": (val) => false, // cmd flush unlocked cache memory.
  "flush_locked": (val) => false, // cmd flush unlocked and locked cache memory.
  "fog_color": (val) => val == -1, //
  "fog_colorskybox": (val) => val == -1, //
  "fog_enable": (val) => val == 1, //
  "fog_enable_water_fog": (val) => val == 1, //
  "fog_enableskybox": (val) => val == 1, //
  "fog_end": (val) => val == -1, //
  "fog_endskybox": (val) => val == -1, //
  "fog_hdrcolorscale": (val) => val == -1, //
  "fog_hdrcolorscaleskybox": (val) => val == -1, //
  "fog_maxdensity": (val) => val == -1, //
  "fog_maxdensityskybox": (val) => val == -1, //
  "fog_override": (val) => val == 0, // overrides the map's fog settings (-1 populates fog_ vars with map's values)
  "fog_start": (val) => val == -1, //
  "fog_startskybox": (val) => val == -1, //
  "fog_volume_debug": (val) => val == 0, // if enabled, prints diagnostic information about the current fog volume
  "fogui": (val) => false, // cmd show/hide fog control ui.
  "force_audio_english": (val) => true, // keeps track of whether we're forcing english in a localized language.
  "force_centerview": (val) => false, // cmd
  "forcebind": (val) => true, // cmd bind a command to an available key. (forcebind command opt:suggestedkey)
  "+forward": (val) => true, // cmd
  "-forward": (val) => true, // cmd
  "foundry_engine_get_mouse_control": (val) => false, // cmd give the engine control of the mouse.
  "foundry_engine_release_mouse_control": (val) => false, // cmd give the control of the mouse back to hammer.
  "foundry_select_entity": (val) => false, // cmd select the entity under the crosshair or select entities with the specified name.
  "foundry_sync_hammer_view": (val) => false, // cmd move hammer's 3d view to the same position as the engine's 3d view.
  "foundry_update_entity": (val) => false, // cmd updates the entity's position/angles when in edit mode
  "fov_desired": (val) => val >= 45 && val <= 140, //  sets the base field-of-view.
  "fps_max": (val) => val >= 30 && val < 1000, //  frame rate limiter
  "fps_max_splitscreen": (val) => val >= 30 && val < 1000, //  frame rate limiter, splitscreen
  "free_pass_peek_debug": (val) => val == 0, //
  "fs_clear_open_duplicate_times": (val) => true, // cmd clear the list of files that have been opened.
  "fs_dump_open_duplicate_times": (val) => true, // cmd set fs_report_long_reads 1 before loading to use this. prints a list of files that were opened more than once and ~how long was
  "fs_enable_stats": (val) => true, //
  "fs_fios_cancel_prefetches": (val) => true, // cmd cancels all the prefetches in progress.
  "fs_fios_flush_cache": (val) => true, // cmd flushes the fios hdd cache.
  "fs_fios_prefetch_file": (val) => true, // cmd prefetches a file: </ps3_game/usrdir/filename.bin>. the preftech is medium priority and persistent.
  "fs_fios_prefetch_file_in_pack": (val) => true, // cmd prefetches a file in a pack: <portal2/models/container_ride/finedebris_part5.ani>. the preftech is medium priority and non-pers
  "fs_fios_print_prefetches": (val) => true, // cmd displays all the prefetches currently in progress.
  "fs_monitor_read_from_pack": (val) => true, // 0:off, 1:any, 2:sync only
  "fs_printopenfiles": (val) => true, // cmd show all files currently opened by the engine.
  "fs_report_long_reads": (val) => true, // 0:off, 1:all (for tracking accumulated duplicate read times), >1:microsecond threshold
  "fs_report_sync_opens": (val) => true, // 0:off, 1:always, 2:not during map load
  "fs_report_sync_opens_callstack": (val) => true, // 0 to not display the call-stack when we hit a fs_report_sync_opens warning. set to 1 to display the call-stack.
  "fs_syncdvddevcache": (val) => true, // cmd force the 360 to get updated files that are in your p4 changelist(s) from the host pc when running with -dvddev.
  "fs_warning_level": (val) => true, // cmd set the filesystem warning level.
  "fs_warning_mode": (val) => true, // 0:off, 1:warn main thread, 2:warn other threads
  "func_break_max_pieces": (val) => val == 15, //
  "func_break_reduction_factor": (val) => val == 0, //
  "func_breakdmg_bullet": (val) => val == 0, //
  "func_breakdmg_club": (val) => val == 1, //
  "func_breakdmg_explosive": (val) => val == 1, //
  "futbol_shooter_distance_from_target": (val) => val == 64, //
  "futbol_shooter_target_height_offset": (val) => val == 0, //
  "futbol_shooter_target_reticule_enabled": (val) => val == 0, //
  "fx_glass_velocity_cap": (val) => val == 0, // maximum downwards speed of shattered glass particles
  "fx_new_sparks": (val) => val == 1, // use new style sparks.
  "g15_dumpplayer": (val) => false, // cmd spew player data.
  "g15_reload": (val) => false, // cmd reloads the logitech g-15 keyboard configs.
  "g15_update_msec": (val) => val == 250, // logitech g-15 keyboard update interval.
  "g_ai_threadedgraphbuild": (val) => val == 0, // if true, use experimental threaded node graph building.
  "g_debug_angularsensor": (val) => val == 0, //
  "g_debug_constraint_sounds": (val) => val == 0, // enable debug printing about constraint sounds.
  "g_debug_doors": (val) => val == 0, //
  "g_debug_npc_vehicle_roles": (val) => val == 0, //
  "g_debug_physcannon": (val) => val == 0, //
  "g_debug_ragdoll_removal": (val) => true, //
  "g_debug_ragdoll_visualize": (val) => true, //
  "g_debug_trackpather": (val) => val == 0, //
  "g_debug_transitions": (val) => val == 0, // set to 1 and restart the map to be warned if the map has no trigger_transition volumes. set to 2 to see a dump of all entities
  "g_debug_turret": (val) => val == 0, //
  "g_debug_vehiclebase": (val) => val == 0, //
  "g_debug_vehicledriver": (val) => val == 0, //
  "g_debug_vehicleexit": (val) => val == 0, //
  "g_debug_vehiclesound": (val) => val == 0, //
  "g_language": (val) => true, //
  "g_ragdoll_fadespeed": (val) => true, //
  "g_ragdoll_important_maxcount": (val) => true, //
  "g_ragdoll_lvfadespeed": (val) => true, //
  "g_ragdoll_maxcount": (val) => true, //
  "gameinstructor_dump_open_lessons": (val) => false, // cmd gives a list of all currently open lessons.
  "gameinstructor_enable": (val) => true, // display in game lessons that teach new players.
  "gameinstructor_find_errors": (val) => val == 0, // set to 1 and the game instructor will run every scripted command to uncover errors.
  "gameinstructor_reload_lessons": (val) => false, // cmd shuts down all open lessons and reloads them from the script file.
  "gameinstructor_reset_counts": (val) => true, // cmd resets all display and success counts to zero.
  "gameinstructor_save_restore_lessons": (val) => val == 1, // set to 0 to disable save/load of open lesson opportunities in single player.
  "gameinstructor_start_sound_cooldown": (val) => val == 4, // number of seconds forced between similar lesson start sounds.
  "gameinstructor_verbose": (val) => val == 0, // set to 1 for standard debugging or 2 (in combo with gameinstructor_verbose_lesson) to show update actions.
  "gameinstructor_verbose_lesson": (val) => val == 0, // display more verbose information for lessons have this name.
  "gamestats_file_output_directory": (val) => true, // when -gamestatsfileoutputonly is specified, file will be emitted here instead of to modpath
  "gameui_activate": (val) => true, // cmd shows the game ui
  "gameui_allowescape": (val) => true, // cmd escape key allowed to hide game ui
  "gameui_allowescapetoshow": (val) => true, // cmd escape key allowed to show game ui
  "gameui_hide": (val) => true, // cmd hides the game ui
  "gameui_preventescape": (val) => true, // cmd escape key doesn't hide game ui
  "gameui_preventescapetoshow": (val) => true, // cmd escape key doesn't show game ui
  "gameui_xbox": (val) => true, //
  "getpos": (val) => false, // cmd dump position and angles to the console
  "getpos_exact": (val) => false, // cmd dump origin and angles to the console
  "give": (val) => false, // cmd give item to player.  arguments: <item_name>
  "give_me_a_point": (val) => false, // cmd give yourself a point
  "give_portalgun": (val) => true, // cmd equips the player with a single portal portalgun.  arguments:    none
  "givecurrentammo": (val) => false, // cmd give a supply of ammo for current weapon..
  "gl_clear": (val) => true, //
  "gl_clear_randomcolor": (val) => true, // clear the back buffer to random colors every frame. helps spot open seams in geometry.
  "global_event_log_enabled": (val) => val == 0, // enables the global event log system
  "global_set": (val) => false, // cmd global_set <globalname> <state>: sets the state of the given env_global (0 = off, 1 = on, 2 = dead).
  "glow_outline_effect_enable": (val) => val == 1, // enable entity outline glow effects.
  "glow_outline_width": (val) => val == 6, // width of glow outline effect in screen space.
  "god": (val) => false, // cmd toggle. player becomes invulnerable.
  "gpu_level": (val) => true, // gpu level - default: high
  "gpu_mem_level": (val) => true, // memory level - default: high
  "+graph": (val) => false, // cmd
  "-graph": (val) => false, // cmd
  "+grenade1": (val) => false, // cmd
  "-grenade1": (val) => false, // cmd
  "+grenade2": (val) => false, // cmd
  "-grenade2": (val) => false, // cmd
  "groundlist": (val) => false, // cmd display ground entity list <index>
  "hammer_update_entity": (val) => false, // cmd updates the entity's position/angles when in edit mode
  "hammer_update_safe_entities": (val) => false, // cmd updates entities in the map that can safely be updated (don't have parents or are affected by constraints). also excludes entit
  "heartbeat": (val) => false, // cmd force heartbeat of master servers
  "help": (val) => false, // cmd find help about a convar/concommand.
  "hideconsole": (val) => true, // cmd hide the console.
  "hidehud": (val) => true, //
  "hidepanel": (val) => true, // cmd hides a viewport panel <name>
  "hl2_episodic": (val) => val == 0, //
  "host_flush_threshold": (val) => val == 12, // memory threshold below which the host should flush caches between server instances
  "host_framerate": (val) => val == 0, // set to lock per-frame time elapse.
  "host_limitlocal": (val) => val == 0, // apply cl_cmdrate and cl_updaterate to loopback connection
  "host_map": (val) => true, // current map name.
  "host_print_frame_times": (val) => val == 0, //
  "host_profile": (val) => val == 0, //
  "host_runframe_input_parcelremainder": (val) => val == 1, //
  "host_runofftime": (val) => false, // cmd run off some time without rendering/updating sounds
  "host_showcachemiss": (val) => val == 0, // print a debug message when the client or server cache is missed.
  "host_showipccallcount": (val) => val == 0, // print # of ipc calls this number of times per second. if set to -1, the # of ipc calls is shown every frame.
  "host_sleep": (val) => val == 0, // force the host to sleep a certain number of milliseconds each frame.
  "host_speeds": (val) => val == 0, // show general system running times.
  "host_threaded_sound": (val) => val == 0, // run the sound on a thread (independent of mix)
  "host_timescale": (val) => val == 1, // prescale the clock by this amount.
  "host_writeconfig": (val) => true, // cmd store current settings to config.cfg (or specified .cfg file).
  "host_writeconfig_ss": (val) => true, // cmd store current settings to config.cfg (or specified .cfg file) with first param as splitscreen index.
  "hostfile": (val) => val == 0, // the host file to load.
  "hostip": (val) => true, // host game server ip
  "hostname": (val) => true, // hostname for server.
  "hostport": (val) => true, // host game server port
  "hot_potato_end_color": (val) => true, // the ending color of the hot potato, before it starts the final explode sequence.
  "hot_potato_explode_on_fizzle": (val) => val == 0, // if the hot potato should explode when it fizzles.
  "hot_potato_explosion_damage": (val) => val == 25, // the damage of the explosion for the hot potato.
  "hot_potato_explosion_damage_falloff": (val) => val == 0, // the percentage of damage taken at the edge of the explosion.
  "hot_potato_explosion_debug": (val) => val == 0, // debug the explosion of the hot potato.
  "hot_potato_explosion_magnitude": (val) => val == 0, // the magnitude of the explosion for the hot potato.
  "hot_potato_explosion_radius": (val) => val == 200, // the radius of the explosion for the hot potato.
  "hot_potato_flash_duration": (val) => val == 1, // the flash duration of the hot potato, right before it explodes.
  "hot_potato_flash_end_color": (val) => true, // the final color of the hot potato, right before it explodes.
  "hot_potato_flash_start_color": (val) => true, // the start color for the hot potato flashing before it explodes.
  "hot_potato_flash_start_time": (val) => val == 3, // the time before the hot potato explodes when it start to flash.
  "hot_potato_hit_breakables": (val) => val == 1, // if the hot potato should hit breakable entities.
  "hot_potato_phys_mag": (val) => val == 100, // magnitude of physics force for an hot potato
  "hot_potato_phys_rad": (val) => val == 45, // magnitude of physics force for an hot potato
  "hot_potato_physics_punt_player": (val) => val == 1, // physically perturb the player when the explosion hits them
  "hot_potato_start_color": (val) => true, // the starting color of the hot potato.
  "hot_potato_use_cooldown_time": (val) => val == 0, // the cooldown time for the use key after the player picks up the hot potato.
  "hover_turret_break_dist": (val) => true, //
  "hud_autoaim_method": (val) => val == 1, //
  "hud_autoaim_scale_icon": (val) => val == 0, //
  "hud_autoreloadscript": (val) => val == 0, // automatically reloads the animation script each time one is ran
  "hud_draw_active_reticle": (val) => val == 0, //
  "hud_draw_fixed_reticle": (val) => val == 1, //
  "hud_drawhistory_time": (val) => true, //
  "hud_fastswitch": (val) => true, //
  "hud_magnetism": (val) => true, //
  "hud_quickinfo": (val) => true, //
  "hud_quickinfo_swap": (val) => true, //
  "hud_reloadscheme": (val) => false, // cmd reloads hud layout and animation scripts.
  "hud_reticle_alpha_speed": (val) => true, //
  "hud_reticle_maxalpha": (val) => true, //
  "hud_reticle_minalpha": (val) => true, //
  "hud_reticle_scale": (val) => true, //
  "hud_saytext_time": (val) => true, //
  "hud_set_challenge_font_color": (val) => true, // cmd set a new font color for challenge stats.
  "hud_show_control_helper": (val) => true, //
  "hud_subtitles": (val) => true, // cmd plays the subtitles: <filename>
  "hud_takesshots": (val) => true, // auto-save a scoreboard screenshot at the end of a map.
  "hunk_print_allocations": (val) => false, // cmd
  "hunk_track_allocation_types": (val) => val == 1, //
  "hurtme": (val) => false, // cmd hurts the player.  arguments: <health to lose>
  "ice_falling_damage_scale": (val) => val == 0, //
  "impulse": (val) => false, // cmd
  "in_forceuser": (val) => val == 0, // force user input to this split screen player.
  "in_usekeyboardsampletime": (val) => val == 1, // use keyboard sample time smoothing.
  "incrementvar": (val) => cvarTestSafe[val.split(" ")[0]](""), // cmd increment specified convar value.
  "invnext": (val) => true, // cmd
  "invprev": (val) => true, // cmd
  "ip": (val) => true, // overrides ip for multihomed hosts
  "item_enable_dynamic_loading": (val) => true, // enable/disable dynamic streaming of econ content.
  "item_show_whitelistable_definitions": (val) => false, // cmd lists the item definitions that can be whitelisted in the item_whitelist.txt file in tournament mode.
  "+jlook": (val) => true, // cmd
  "-jlook": (val) => true, // cmd
  "joy_accel_filter": (val) => true, //
  "joy_accelmax": (val) => true, //
  "joy_accelscale": (val) => true, //
  "joy_advanced": (val) => true, //
  "joy_advaxisr": (val) => true, //
  "joy_advaxisu": (val) => true, //
  "joy_advaxisv": (val) => true, //
  "joy_advaxisx": (val) => true, //
  "joy_advaxisy": (val) => true, //
  "joy_advaxisz": (val) => true, //
  "joy_autoaimdampen": (val) => true, // how much to scale user stick input when the gun is pointing at a valid target.
  "joy_autoaimdampenrange": (val) => true, // the stick range where autoaim dampening is applied. 0 = off
  "joy_autosprint": (val) => true, // automatically sprint when moving with an analog joystick
  "joy_axisbutton_threshold": (val) => true, // analog axis range before a button press is registered.
  "joy_cfg_custom": (val) => false, // cmd
  "joy_cfg_custom_bindingsa": (val) => true, //
  "joy_cfg_custom_bindingsa2": (val) => true, //
  "joy_cfg_custom_bindingsb": (val) => true, //
  "joy_cfg_custom_bindingsb2": (val) => true, //
  "joy_cfg_preset": (val) => true, //
  "joy_cfg_preset2": (val) => true, //
  "joy_circle_correct": (val) => true, //
  "joy_deadzone_mode": (val) => true, // 0 => cross-shaped deadzone (default), 1 => square deadzone.
  "joy_diagonalpov": (val) => true, // pov manipulator operates on diagonal axes, too.
  "joy_display_input": (val) => true, //
  "joy_forwardsensitivity": (val) => true, //
  "joy_forwardthreshold": (val) => true, //
  "joy_invertx": (val) => true, // whether to invert the x axis of the joystick for looking.
  "joy_invertx2": (val) => true, // whether to invert the x axis of the joystick for looking.
  "joy_inverty": (val) => true, // whether to invert the y axis of the joystick for looking.
  "joy_inverty2": (val) => true, // whether to invert the y axis of the joystick for looking.
  "joy_legacy": (val) => true, // turn on/off 'legacy' mapping for control sticks.
  "joy_legacy2": (val) => true, // turn on/off 'legacy' mapping for control sticks.
  "joy_lookspin_default": (val) => true, //
  "joy_lowend": (val) => true, //
  "joy_lowmap": (val) => true, //
  "joy_movement_stick": (val) => true, // which stick controls movement (0 is left stick)
  "joy_movement_stick2": (val) => true, // which stick controls movement (0 is left stick)
  "joy_name": (val) => true, //
  "joy_no_accel_jump": (val) => true, //
  "joy_pegged": (val) => true, //
  "joy_pitchsensitivity": (val) => true, //
  "joy_pitchsensitivity2": (val) => true, //
  "joy_pitchsensitivity_default": (val) => true, //
  "joy_pitchthreshold": (val) => true, //
  "joy_response_look": (val) => true, // 'look' stick response mode: 0=default, 1=acceleration promotion
  "joy_response_move": (val) => true, // 'movement' stick response mode: 0=linear, 1=quadratic, 2=cubic, 3=quadratic extreme, 4=power function(i.e., pow(x,1/sensitivity
  "joy_response_move_vehicle": (val) => true, //
  "joy_sensitive_step0": (val) => true, //
  "joy_sensitive_step1": (val) => true, //
  "joy_sensitive_step2": (val) => true, //
  "joy_sidesensitivity": (val) => true, //
  "joy_sidethreshold": (val) => true, //
  "joy_variable_frametime": (val) => true, //
  "joy_vehicle_turn_lowend": (val) => true, //
  "joy_vehicle_turn_lowmap": (val) => true, //
  "joy_vibration": (val) => true, // controller vibration.
  "joy_vibration2": (val) => true, // controller vibration.
  "joy_virtual_peg": (val) => true, //
  "joy_wingmanwarrior_centerhack": (val) => true, // wingman warrior centering hack.
  "joy_wingmanwarrior_turnhack": (val) => true, // wingman warrior hack related to turn axes.
  "joy_xcontroller_cfg_loaded": (val) => true, // if 0, the 360controller.cfg file will be executed on startup & option changes.
  "joy_xcontroller_found": (val) => true, // automatically set to 1 if an xcontroller has been detected.
  "joy_yawsensitivity": (val) => true, //
  "joy_yawsensitivity2": (val) => true, //
  "joy_yawsensitivity_default": (val) => true, //
  "joy_yawthreshold": (val) => true, //
  "joyadvancedupdate": (val) => false, // cmd
  "joystick": (val) => true, // true if the joystick is enabled, false otherwise.
  "jpeg": (val) => true, // cmd take a jpeg screenshot:  jpeg <filename> <quality 1-100>.
  "jpeg_quality": (val) => true, // jpeg screenshot quality.
  "+jump": (val) => true, // cmd
  "-jump": (val) => true, // cmd
  "kdtree_test": (val) => false, // cmd tests spatial partition for entities queries.
  "key_findbinding": (val) => true, // cmd find key bound to specified command string.
  "key_listboundkeys": (val) => true, // cmd list bound keys with bindings.
  "key_updatelayout": (val) => true, // cmd updates game keyboard layout to current windows keyboard setting.
  "kick": (val) => false, // cmd kick a player by name.
  "kickid": (val) => false, // cmd kick a player by userid or uniqueid, with a message.
  "kill": (val) => false, // cmd kills the player with generic damage
  "killserver": (val) => false, // cmd shutdown the server.
  "killvector": (val) => false, // cmd kills a player applying force. usage: killvector <player> <x value> <y value> <z value>
  "+klook": (val) => true, // cmd
  "-klook": (val) => true, // cmd
  "lastinv": (val) => true, // cmd
  "+leaderboard": (val) => true, // cmd display in game leaderboard
  "-leaderboard": (val) => true, // cmd hide in game leaderboard
  "leaderboard_duplicate_entries": (val) => true, //
  "leaderboard_force_rank_show_interval": (val) => true, //
  "leaderboard_open": (val) => true, // cmd activate main leaderboard
  "+left": (val) => true, // cmd
  "-left": (val) => true, // cmd
  "light_crosshair": (val) => false, // cmd show texture color at crosshair
  "lightcache_maxmiss": (val) => true, //
  "lightprobe": (val) => false, // cmd samples the lighting environment. creates a cubemap and a file indicating the local lighting in a subdirectory called 'material
  "linefile": (val) => false, // cmd parses map leak data from .lin file
  "listdemo": (val) => false, // cmd list demo file contents.
  "listid": (val) => false, // cmd lists banned users.
  "listip": (val) => false, // cmd list ip addresses on the ban list.
  "listmodels": (val) => false, // cmd list loaded models.
  "listrecentnpcspeech": (val) => false, // cmd displays a list of the last 5 lines of speech from npcs.
  "load": (val) => false, // cmd load a saved game.
  "loader_defer_non_critical_jobs": (val) => true, //
  "loader_dump_table": (val) => false, // cmd
  "loader_spew_info": (val) => true, // 0:off, 1:timing, 2:completions, 3:late completions, 4:creations/purges, -1:all
  "loader_throttle_io": (val) => true, //
  "locator_background_border_color": (val) => true, // the default color for the border.
  "locator_background_border_thickness": (val) => true, // how many pixels the background borders the left and right.
  "locator_background_color": (val) => true, // the default color for the background.
  "locator_background_shift_x": (val) => true, // how many pixels the background is shifted right.
  "locator_background_shift_y": (val) => true, // how many pixels the background is shifted down.
  "locator_background_style": (val) => true, // setting this to 1 will show rectangle backgrounds behind the items word-bubble pointers.
  "locator_background_thickness_x": (val) => true, // how many pixels the background borders the left and right.
  "locator_background_thickness_y": (val) => true, // how many pixels the background borders the top and bottom.
  "locator_fade_time": (val) => true, // number of seconds it takes for a lesson to fully fade in/out.
  "locator_icon_max_size_non_ss": (val) => true, // minimum scale of the icon on the screen
  "locator_icon_min_size_non_ss": (val) => true, // minimum scale of the icon on the screen
  "locator_lerp_rest": (val) => true, // number of seconds before moving from the center.
  "locator_lerp_speed": (val) => true, // speed that static lessons move along the y axis.
  "locator_lerp_time": (val) => true, // number of seconds to lerp before reaching final destination
  "locator_pulse_time": (val) => true, // number of seconds to pulse after changing icon or position
  "locator_split_len": (val) => true, //
  "locator_split_maxwide_percent": (val) => true, //
  "locator_start_at_crosshair": (val) => true, // start position at the crosshair instead of the top middle of the screen.
  "locator_target_offset_x": (val) => true, // how many pixels to offset the locator from the target position.
  "locator_target_offset_y": (val) => true, // how many pixels to offset the locator from the target position.
  "locator_topdown_style": (val) => true, // topdown games set this to handle distance and offscreen location differently.
  "log": (val) => true, // cmd enables logging to file, console, and udp < on | off >.
  "log_color": (val) => true, // cmd set the color of a logging channel.
  "log_dumpchannels": (val) => true, // cmd dumps information about all logging channels.
  "log_flags": (val) => true, // cmd set the flags on a logging channel.
  "log_level": (val) => true, // cmd set the spew level of a logging channel.
  "logaddress_add": (val) => true, // cmd set address and port for remote host <ip:port>.
  "logaddress_del": (val) => true, // cmd remove address and port for remote host <ip:port>.
  "logaddress_delall": (val) => true, // cmd remove all udp addresses being logged to
  "logaddress_list": (val) => true, // cmd list all addresses currently being used by logaddress.
  "+lookdown": (val) => true, // cmd
  "-lookdown": (val) => true, // cmd
  "+lookspin": (val) => true, // cmd
  "-lookspin": (val) => true, // cmd
  "lookspring": (val) => true, //
  "lookstrafe": (val) => true, //
  "+lookup": (val) => true, // cmd
  "-lookup": (val) => true, // cmd
  "loopsingleplayermaps": (val) => true, //
  "lservercfgfile": (val) => val == 0, //
  "m_customaccel": (val) => true, // custom mouse acceleration: 0: custom accelaration disabled 1: mouse_acceleration = min(m_customaccel_max, pow(raw_mouse_delta,
  "m_customaccel_exponent": (val) => true, // mouse move is raised to this power before being scaled by scale factor.
  "m_customaccel_max": (val) => true, // max mouse move scale factor, 0 for no limit
  "m_customaccel_scale": (val) => true, // custom mouse acceleration value.
  "m_forward": (val) => true, // mouse forward factor.
  "m_mouseaccel1": (val) => true, // windows mouse acceleration initial threshold (2x movement).
  "m_mouseaccel2": (val) => true, // windows mouse acceleration secondary threshold (4x movement).
  "m_mousespeed": (val) => true, // windows mouse acceleration (0 to disable, 1 to enable [windows 2000: enable initial threshold], 2 to enable secondary threshold
  "m_pitch": (val) => true, // mouse pitch factor.
  "m_pitch2": (val) => true, // mouse pitch factor.
  "m_rawinput": (val) => true, // use raw input for mouse input.
  "m_side": (val) => true, // mouse side factor.
  "m_yaw": (val) => true, // mouse yaw factor.
  "map": (val) => false, // cmd start playing on specified map.
  "map_background": (val) => false, // cmd runs a map as the background to the main menu.
  "map_commentary": (val) => false, // cmd start playing, with commentary, on a specified map.
  "map_edit": (val) => false, // cmd
  "map_noareas": (val) => val == 0, // disable area to area connection testing.
  "map_wants_save_disable": (val) => true, //
  "mapcyclefile": (val) => val == 0, // name of the .txt file used to cycle the maps on multiplayer servers
  "maps": (val) => false, // cmd displays list of maps.
  "mat_aaquality": (val) => true, //
  "mat_accelerate_adjust_exposure_down": (val) => true, //
  "mat_alternatefastclipalgorithm": (val) => true, //
  "mat_ambient_light_b": (val) => true, //
  "mat_ambient_light_g": (val) => true, //
  "mat_ambient_light_r": (val) => true, //
  "mat_aniso_disable": (val) => true, // note: you must change mat_forceaniso after changing this convar for this to take effect
  "mat_antialias": (val) => true, //
  "mat_autoexposure_max": (val) => true, //
  "mat_autoexposure_max_multiplier": (val) => true, //
  "mat_autoexposure_min": (val) => true, //
  "mat_bloom_scalefactor_scalar": (val) => true, //
  "mat_bloomamount_rate": (val) => true, //
  "mat_bloomscale": (val) => true, //
  "mat_blur_b": (val) => true, //
  "mat_blur_g": (val) => true, //
  "mat_blur_r": (val) => true, //
  "mat_bufferprimitives": (val) => true, //
  "mat_bumpbasis": (val) => true, //
  "mat_bumpmap": (val) => val == 0, //
  "mat_camerarendertargetoverlaysize": (val) => val == 128, //
  "mat_clipz": (val) => true, //
  "mat_colcorrection_disableentities": (val) => true, // disable map color-correction entities
  "mat_colcorrection_editor": (val) => true, //
  "mat_colcorrection_forceentitiesclientside": (val) => true, // forces color correction entities to be updated on the client
  "mat_compressedtextures": (val) => true, //
  "mat_configcurrent": (val) => true, // cmd show the current video control panel config for the material system
  "mat_crosshair": (val) => false, // cmd display the name of the material under the crosshair
  "mat_crosshair_edit": (val) => false, // cmd open the material under the crosshair in the editor defined by mat_crosshair_edit_editor
  "mat_crosshair_explorer": (val) => false, // cmd open the material under the crosshair in explorer and highlight the vmt file
  "mat_crosshair_printmaterial": (val) => false, // cmd print the material under the crosshair
  "mat_crosshair_reloadmaterial": (val) => false, // cmd reload the material under the crosshair
  "mat_debug": (val) => false, // cmd activates debugging spew for a specific material.
  "mat_debug_bloom": (val) => true, //
  "mat_debug_postprocessing_effects": (val) => true, // 0 = off, 1 = show post-processing passes in quadrants of the screen, 2 = only apply post-processing to the centre of the screen
  "mat_debugalttab": (val) => true, //
  "mat_debugdepth": (val) => true, //
  "mat_debugdepthmode": (val) => true, //
  "mat_debugdepthval": (val) => true, //
  "mat_debugdepthvalmax": (val) => true, //
  "mat_defaultlightmap": (val) => true, // default brightness for lightmaps where none have been created in the level.
  "mat_depth_blur_focal_distance_override": (val) => true, //
  "mat_depth_blur_strength_override": (val) => true, //
  "mat_depthbias_shadowmap": (val) => true, //
  "mat_depthfeather_enable": (val) => true,
  "mat_detail_tex": (val) => true, //
  "mat_diffuse": (val) => true, //
  "mat_disable_bloom": (val) => true, //
  "mat_disable_fancy_blending": (val) => true, //
  "mat_disablehwmorph": (val) => true, //
  "mat_displacementmap": (val) => val == 1, //
  "mat_do_not_shrink_dynamic_vb": (val) => true, // do not shrink the size of dynamic vertex buffers during map load/unload to save memory.
  "mat_dof_enabled": (val) => true, //
  "mat_dof_far_blur_depth": (val) => true, //
  "mat_dof_far_blur_radius": (val) => true, //
  "mat_dof_far_focus_depth": (val) => true, //
  "mat_dof_max_blur_radius": (val) => true, //
  "mat_dof_near_blur_depth": (val) => true, //
  "mat_dof_near_blur_radius": (val) => true, //
  "mat_dof_near_focus_depth": (val) => true, //
  "mat_dof_override": (val) => true, //
  "mat_dof_quality": (val) => true, //
  "mat_drawflat": (val) => val == 0, //
  "mat_drawtexture": (val) => val == 0, // enable debug view texture
  "mat_drawtexturescale": (val) => val == 1, // debug view texture scale
  "mat_drawtitlesafe": (val) => val == 0, // enable title safe overlay
  "mat_drawwater": (val) => val == 1, //
  "mat_dynamic_tonemapping": (val) => true, //
  "mat_dynamiclightmaps": (val) => true, //
  "mat_dynamicpaintmaps": (val) => true, //
  "mat_dxlevel": (val) => true,
  "mat_edit": (val) => false, // cmd bring up the material under the crosshair in the editor
  "mat_envmapsize": (val) => true, //
  "mat_envmaptgasize": (val) => true, //
  "mat_excludetextures": (val) => val == 0, //
  "mat_exposure_center_region_x": (val) => true, //
  "mat_exposure_center_region_y": (val) => true, //
  "mat_fastclip": (val) => true, //
  "mat_fastnobump": (val) => val == 0, //
  "mat_fastspecular": (val) => val == 1, // enable/disable specularity for visual testing.  will not reload materials and will not affect perf.
  "mat_fillrate": (val) => true, //
  "mat_filterlightmaps": (val) => true, //
  "mat_filtertextures": (val) => true, //
  "mat_force_bloom": (val) => true, //
  "mat_force_tonemap_scale": (val) => true, //
  "mat_force_vertexfog": (val) => true,
  "mat_forceaniso": (val) => true, //
  "mat_forcedynamic": (val) => true, //
  "mat_forcehardwaresync": (val) => true, //
  "mat_frame_sync_enable": (val) => true, //
  "mat_frame_sync_force_texture": (val) => true, // force frame syncing to lock a managed texture.
  "mat_framebuffercopyoverlaysize": (val) => true, //
  "mat_fullbright": (val) => true, //
  "mat_glidnarb": (val) => true, //
  "mat_grain_enable": (val) => true, //
  "mat_grain_scale_override": (val) => true, //
  "mat_hdr_enabled": (val) => true, // cmd report if hdr is enabled for debugging
  "mat_hdr_level": (val) => true, // set to 0 for no hdr, 1 for ldr+bloom on hdr maps, and 2 for full hdr on hdr maps.
  "mat_hdr_manual_tonemap_rate": (val) => true, //
  "mat_hdr_tonemapscale": (val) => true, // the hdr tonemap scale. 1 = use autoexposure, 0 = eyes fully closed, 16 = eyes wide open.
  "mat_hdr_uncapexposure": (val) => true, //
  "mat_hsv": (val) => true, //
  "mat_info": (val) => false, // cmd shows material system info
  "mat_leafvis": (val) => val == 0, // draw wireframe of: [0] nothing, [1] current leaf, [2] entire vis cluster, or [3] entire pvs (see mat_leafvis_draw_mask for what
  "mat_leafvis_draw_mask": (val) => val == 3, // a bitfield which affects leaf visibility debug rendering.  -1: show all, bit 0: render pvs-visible leafs, bit 1: render pvs- an
  "mat_leafvis_freeze": (val) => val == 0, // if set to 1, uses the last known leaf visibility data for visualization.  if set to 0, updates based on camera movement.
  "mat_leafvis_update_every_frame": (val) => val == 0, // updates leafvis debug render every frame (expensive)
  "mat_levelflush": (val) => true, //
  "mat_lightmap_pfms": (val) => true, // outputs .pfm files containing lightmap data for each lightmap page when a level exits.
  "mat_loadtextures": (val) => val == 1, //
  "mat_local_contrast_edge_scale_override": (val) => true, //
  "mat_local_contrast_enable": (val) => true, //
  "mat_local_contrast_midtone_mask_override": (val) => true, //
  "mat_local_contrast_scale_override": (val) => true, //
  "mat_local_contrast_vignette_end_override": (val) => true, //
  "mat_local_contrast_vignette_start_override": (val) => true, //
  "mat_lpreview_mode": (val) => true, //
  "mat_luxels": (val) => true, //
  "mat_max_worldmesh_vertices": (val) => true, //
  "mat_maxframelatency": (val) => val == 1, //
  "mat_measurefillrate": (val) => true, //
  "mat_mipmaptextures": (val) => true, //
  "mat_monitorgamma": (val) => true, // monitor gamma (typically 2.2 for crt and 1.7 for lcd)
  "mat_monitorgamma_force_480_full_tv_range": (val) => true, //
  "mat_monitorgamma_pwl2srgb": (val) => true, //
  "mat_monitorgamma_tv_enabled": (val) => true, //
  "mat_monitorgamma_tv_exp": (val) => true, //
  "mat_monitorgamma_tv_range_max": (val) => true, //
  "mat_monitorgamma_tv_range_min": (val) => true, //
  "mat_monitorgamma_vganonpwlgamma": (val) => true, //
  "mat_morphstats": (val) => true, //
  "mat_motion_blur_enabled": (val) => true, //
  "mat_motion_blur_falling_intensity": (val) => true, //
  "mat_motion_blur_falling_max": (val) => true, //
  "mat_motion_blur_falling_min": (val) => true, //
  "mat_motion_blur_forward_enabled": (val) => true, //
  "mat_motion_blur_percent_of_screen_max": (val) => true, //
  "mat_motion_blur_rotation_intensity": (val) => true, //
  "mat_motion_blur_strength": (val) => true, //
  "mat_noise_enable": (val) => true, //
  "mat_non_hdr_bloom_scalefactor": (val) => true, //
  "mat_norendering": (val) => val == 0, //
  "mat_normalmaps": (val) => val == 0, //
  "mat_normals": (val) => val == 0, //
  "mat_object_motion_blur_enable": (val) => true, //
  "mat_object_motion_blur_model_scale": (val) => true, //
  "mat_paint_enabled": (val) => val == 1, //
  "mat_parallaxmap": (val) => true, //
  "mat_parallaxmapsamplesmax": (val) => true, //
  "mat_parallaxmapsamplesmin": (val) => true, //
  "mat_phong": (val) => true, //
  "mat_picmip": (val) => true, //
  "mat_postprocess_enable": (val) => true, //
  "mat_postprocess_x": (val) => true, //
  "mat_postprocess_y": (val) => true, //
  "mat_powersavingsmode": (val) => true, // power savings mode
  "mat_print_top_model_vert_counts": (val) => val == 0, // constantly print to screen the top n models as measured by total faces rendered this frame
  "mat_processtoolvars": (val) => true, //
  "mat_proxy": (val) => true, //
  "mat_queue_mode": (val) => true, // the queue/thread mode the material system should use: -1=default, 0=synchronous single thread, 1=queued single thread, 2=queued
  "mat_queue_priority": (val) => true, //
  "mat_reducefillrate": (val) => true, //
  "mat_reduceparticles": (val) => true, //
  "mat_reloadallmaterials": (val) => false, // cmd reloads all materials
  "mat_reloadmaterial": (val) => false, // cmd reloads a single material
  "mat_reloadtextures": (val) => false, // cmd reloads all textures
  "mat_remoteshadercompile": (val) => val == 0, //
  "mat_rendered_faces_count": (val) => true, // set to n to count how many faces each model draws each frame and spew the top n offenders from the last 150 frames (use 'mat_re
  "mat_rendered_faces_spew": (val) => true, // cmd 'mat_rendered_faces_spew <n>' spew the number of faces rendered for the top n models used this frame (mat_rendered_faces_count
  "mat_report_queue_status": (val) => true, //
  "mat_reporthwmorphmemory": (val) => true, // cmd reports the amount of size in bytes taken up by hardware morph textures.
  "mat_reversedepth": (val) => true, //
  "mat_savechanges": (val) => false, // cmd saves current video configuration to the registry
  "mat_screen_blur_override": (val) => true, //
  "mat_setvideomode": (val) => true, // cmd sets the width, height, windowed state of the material system
  "mat_shadercount": (val) => true, // cmd display count of all shaders and reset that count
  "mat_shadowstate": (val) => true, //
  "mat_show_histogram": (val) => true, //
  "mat_show_texture_memory_usage": (val) => true, // display the texture memory usage on the hud.
  "mat_showcamerarendertarget": (val) => true, //
  "mat_showenvmapmask": (val) => true, //
  "mat_showframebuffertexture": (val) => val == 0, //
  "mat_showlightmappage": (val) => true, //
  "mat_showlowresimage": (val) => true, //
  "mat_showmaterials": (val) => false, // cmd show materials.
  "mat_showmaterialsverbose": (val) => false, // cmd show materials (verbose version).
  "mat_showmiplevels": (val) => val == 0, // color-code miplevels 2: normalmaps, 1: everything else
  "mat_showtextures": (val) => false, // cmd show used textures.
  "mat_showwatertextures": (val) => val == 0, //
  "mat_slopescaledepthbias_shadowmap": (val) => true, //
  "mat_software_aa_blur_one_pixel_lines": (val) => true, // how much software aa should blur one-pixel thick lines: (0.0 - none), (1.0 - lots)
  "mat_software_aa_debug": (val) => true, // software aa debug mode: (0 - off), (1 - show number of 'unlike' samples: 0->black, 1->red, 2->green, 3->blue), (2 - show anti-a
  "mat_software_aa_edge_threshold": (val) => true, // software aa - adjusts the sensitivity of the software aa shader's edge detection (default 1.0 - a lower value will soften more
  "mat_software_aa_quality": (val) => true, // software aa quality mode: (0 - 5-tap filter), (1 - 9-tap filter)
  "mat_software_aa_strength": (val) => true, // software aa - perform a software anti-aliasing post-process (an alternative/supplement to msaa). this value sets the strength o
  "mat_software_aa_strength_vgui": (val) => true, // same as mat_software_aa_strength, but forced to this value when called by the post vgui aa pass.
  "mat_software_aa_tap_offset": (val) => true, // software aa - adjusts the displacement of the taps used by the software aa shader (default 1.0 - a lower value will make the im
  "mat_softwarelighting": (val) => true, //
  "mat_softwareskin": (val) => true, //
  "mat_specular": (val) => true, // enable/disable specularity for perf testing.  will cause a material reload upon change.
  "mat_spew_long_frames": (val) => true, // warn about frames that go over 66ms for cert purposes.
  "mat_spewalloc": (val) => true, //
  "mat_spewvertexandpixelshaders": (val) => true, // cmd print all vertex and pixel shaders currently loaded to the console
  "mat_stub": (val) => val == 0, //
  "mat_suppress": (val) => false, // cmd supress a material from drawing
  "mat_surfaceid": (val) => val == 0, //
  "mat_surfacemat": (val) => val == 0, //
  "mat_tessellation_accgeometrytangents": (val) => true, //
  "mat_tessellation_cornertangents": (val) => true, //
  "mat_tessellation_update_buffers": (val) => true, //
  "mat_tessellationlevel": (val) => true, //
  "mat_texture_limit": (val) => val == -1, // if this value is not -1, the material system will limit the amount of texture memory it uses in a frame. useful for identifying
  "mat_texture_list": (val) => val == 0, // for debugging, show a list of used textures per frame
  "+mat_texture_list": (val) => false, // cmd
  "-mat_texture_list": (val) => false, // cmd
  "mat_texture_list_all": (val) => val == 0, // if this is nonzero, then the texture list panel will show all currently-loaded textures.
  "mat_texture_list_all_frames": (val) => val == 2, // how many frames to sample texture memory for all textures.
  "mat_texture_list_content_path": (val) => val == 0, // the content path to the materialsrc directory. if left unset, it'll assume your content directory is next to the currently runn
  "mat_texture_list_exclude": (val) => false, // cmd 'load' - loads the exclude list file, 'reset' - resets all loaded exclude information, 'save' - saves exclude list file
  "mat_texture_list_exclude_editing": (val) => val == 0, //
  "mat_texture_list_txlod": (val) => false, // cmd adjust lod of the last viewed texture +1 to inc resolution, -1 to dec resolution
  "mat_texture_list_txlod_sync": (val) => false, // cmd 'reset' - resets all run-time changes to lod overrides, 'save' - saves all changes to material content files
  "mat_texture_list_view": (val) => val == 1, // if this is nonzero, then the texture list panel will render thumbnails of currently-loaded textures.
  "mat_tonemap_algorithm": (val) => true, // 0 = original algorithm 1 = new algorithm
  "mat_tonemap_min_avglum": (val) => true, //
  "mat_tonemap_percent_bright_pixels": (val) => true, //
  "mat_tonemap_percent_target": (val) => true, //
  "mat_tonemapping_occlusion_use_stencil": (val) => true, //
  "mat_triplebuffered": (val) => true, // this means we want triple buffering if we are fullscreen and vsync'd
  "mat_use_compressed_hdr_textures": (val) => true, //
  "mat_viewportscale": (val) => true, // scale down the main viewport (to reduce gpu impact on cpu profiling)
  "mat_vignette_enable": (val) => true, //
  "mat_vsync": (val) => true, // force sync to vertical retrace
  "mat_wateroverlaysize": (val) => val == 128, //
  "mat_wireframe": (val) => val == 0, //
  "mat_yuv": (val) => val == 0, //
  "max_noisy_blobs_per_second": (val) => true, //
  "max_sound_channels_per_paint_stream": (val) => true, //
  "maxplayers": (val) => true, // cmd change the maximum number of players allowed on this server.
  "mem_compact": (val) => true, // cmd
  "mem_dump": (val) => false, // cmd dump memory stats to text file.
  "mem_dumpstats": (val) => true, // dump current and max heap usage info to console at end of frame ( set to 2 for continuous output )
  "mem_dumpvballocs": (val) => true, // cmd dump vb memory allocation stats.
  "mem_eat": (val) => true, // cmd
  "mem_force_flush": (val) => true, // force cache flush of unlocked resources on every alloc
  "mem_force_flush_section": (val) => true, // cache section to restrict mem_force_flush
  "mem_incremental_compact": (val) => true, // cmd
  "mem_incremental_compact_rate": (val) => true, // rate at which to attempt internal heap compation
  "mem_level": (val) => true, // memory level - default: high
  "mem_max_heapsize": (val) => true, // maximum amount of memory to dedicate to engine hunk and datacache (in mb)
  "mem_max_heapsize_dedicated": (val) => true, // maximum amount of memory to dedicate to engine hunk and datacache, for dedicated server (in mb)
  "mem_min_heapsize": (val) => true, // minimum amount of memory to dedicate to engine hunk and datacache (in mb)
  "mem_periodicdumps": (val) => true, // write periodic memstats dumps every n seconds.
  "mem_test": (val) => true, // cmd
  "mem_test_each_frame": (val) => true, // run heap check at end of every frame
  "mem_test_every_n_seconds": (val) => true, // run heap check at a specified interval
  "mem_test_quiet": (val) => true, // don't print stats when memtesting
  "mem_vcollide": (val) => false, // cmd dumps the memory used by vcollides
  "mem_verify": (val) => true, // cmd verify the validity of the heap
  "memory": (val) => true, // cmd print memory stats.
  "min_adjusted_pitch_percentage": (val) => true, //
  "miniprofiler_dump": (val) => true, //
  "minisave": (val) => true, // cmd saves game (for current level only!)
  "mm_datacenter_debugprint": (val) => false, // cmd shows information retrieved from data center
  "mm_debugprint": (val) => false, // cmd show debug information about current matchmaking session
  "mm_dedicated_force_servers": (val) => val == 0, // comma delimited list of ip:port of servers used to search for dedicated servers instead of searching for public servers. use sy
  "mm_dedicated_search_maxping": (val) => val == 150, // longest preferred ping to dedicated servers for games
  "mm_dlc_debugprint": (val) => false, // cmd shows information about dlc
  "mm_heartbeat_seconds": (val) => val == 300, //
  "mm_heartbeat_seconds_xlsp": (val) => val == 60, //
  "mm_heartbeat_timeout": (val) => val == 10, //
  "mm_heartbeat_timeout_legacy": (val) => val == 15, //
  "mm_matchmaking_dlcsquery": (val) => val == 2, //
  "mm_matchmaking_version": (val) => val == 9, //
  "mm_server_search_lan_ports": (val) => val == 27015, // ports to scan during lan games discovery. also used to discover and correctly connect to dedicated lan servers behind nats.
  "mm_tu_string": (val) => true, //
  "mod_check_vcollide": (val) => val == 0, // check all vcollides on load
  "mod_dont_load_vertices": (val) => val == 0, // for the dedicated server, supress loading model vertex data
  "mod_forcedata": (val) => true, // forces all model file data into cache on model load.
  "mod_forcetouchdata": (val) => true, // forces all model file data into cache on model load.
  "mod_load_anims_async": (val) => true, //
  "mod_load_fakestall": (val) => true, // forces all ani file loading to stall for specified ms
  "mod_load_mesh_async": (val) => true, //
  "mod_load_preload": (val) => true, // indicates how far ahead in seconds to preload animations.
  "mod_load_showstall": (val) => true, // 1 - show hitches , 2 - show stalls
  "mod_load_vcollide_async": (val) => true, //
  "mod_lock_mdls_on_load": (val) => true, //
  "mod_lock_meshes_on_load": (val) => true, //
  "mod_test_mesh_not_available": (val) => true, //
  "mod_test_not_available": (val) => true, //
  "mod_test_verts_not_available": (val) => true, //
  "mod_touchalldata": (val) => true, // touch model data during level startup
  "mod_trace_load": (val) => true, //
  "morph_debug": (val) => true, //
  "morph_path": (val) => true, //
  "mortar_visualize": (val) => true, //
  "motdfile": (val) => true, // the motd file to load.
  "+mouse_menu": (val) => true, // cmd opens a menu while held
  "-mouse_menu": (val) => true, // cmd executes the highlighted button on the radial menu (if cl_fastradial is 1)
  "+mouse_menu_playtest": (val) => true, // cmd opens a menu while held
  "-mouse_menu_playtest": (val) => true, // cmd executes the highlighted button on the radial menu (if cl_fastradial is 1)
  "+mouse_menu_taunt": (val) => true, // cmd opens a menu while held
  "-mouse_menu_taunt": (val) => true, // cmd executes the highlighted button on the radial menu (if cl_fastradial is 1)
  "+movedown": (val) => true, // cmd
  "-movedown": (val) => true, // cmd
  "+moveleft": (val) => true, // cmd
  "-moveleft": (val) => true, // cmd
  "+moveright": (val) => true, // cmd
  "-moveright": (val) => true, // cmd
  "+moveup": (val) => true, // cmd
  "-moveup": (val) => true, // cmd
  "move_during_ui": (val) => true, // allows player movement while ui is visible.
  "movement_anim_playback_minrate": (val) => true, //
  "movie_fixwave": (val) => true, // cmd fixup corrupted .wav file if engine crashed during startmovie/endmovie, etc.
  "movie_volume_scale": (val) => true, //
  "mp_allownpcs": (val) => true, //
  "mp_allowspectators": (val) => true, // toggles whether the server allows spectator mode or not
  "mp_auto_accept_team_taunt": (val) => true, //
  "mp_autocrosshair": (val) => true, //
  "mp_bonusroundtime": (val) => true, // time after round win until round restarts
  "mp_bot_fling_trail": (val) => true, // when bots reach a certain velocity in the air, they will show a trail behind them (0 = off, 1 = on, 2 = fun)
  "mp_bot_fling_trail_kill_scaler": (val) => true, // the scaler that determines how close to a portal a player has to be (when flinging towards it) before the trail turns off
  "mp_chattime": (val) => true, // amount of time players can chat after the game is over
  "mp_clan_ready_signal": (val) => true, // text that team leader from each team must speak for the match to begin
  "mp_clan_readyrestart": (val) => true, // if non-zero, game will restart once someone from each team gives the ready signal
  "mp_defaultteam": (val) => true, //
  "mp_disable_autokick": (val) => true, // cmd prevents a userid from being auto-kicked
  "mp_disable_respawn_times": (val) => true, //
  "mp_dump_client_completion_data": (val) => true, // cmd prints player completion data for all maps.
  "mp_dump_server_completion_data": (val) => true, // cmd prints player completion data for all maps.
  "mp_earn_taunt": (val) => true, // cmd unlocks, owns, and puts a taunt in the gesture wheel.
  "mp_fadetoblack": (val) => true, // fade a player's screen to black when he dies
  "mp_falldamage": (val) => true, //
  "mp_flashlight": (val) => true, //
  "mp_footsteps": (val) => true, //
  "mp_forcecamera": (val) => true, // restricts spectator modes for dead players
  "mp_forcerespawn": (val) => true, //
  "mp_fraglimit": (val) => true, //
  "mp_friendlyfire": (val) => true, // allows team members to injure other members of their team
  "mp_lock_all_taunts": (val) => true, // cmd locks all available taunts and removes them from the gesture wheel.
  "mp_lock_taunt": (val) => true, // cmd locks a taunt and removes it from the gesture wheel.
  "mp_mark_all_maps_complete": (val) => true, // cmd marks all levels as complete in the save file.
  "mp_mark_all_maps_incomplete": (val) => true, // cmd marks all levels as incomplete in the save file.
  "mp_mark_course_complete": (val) => true, // cmd marks all levels in a branch as complete in the save file.
  "mp_maxrounds": (val) => true, // max number of rounds to play before server changes maps
  "mp_respawnwavetime": (val) => true, // time between respawn waves.
  "mp_restartgame": (val) => true, // if non-zero, game will restart in the specified number of seconds
  "mp_should_gib_bots": (val) => true, //
  "mp_taunt_position_blend_rate": (val) => true, //
  "mp_teamlist": (val) => true, //
  "mp_teamoverride": (val) => true, //
  "mp_teamplay": (val) => true, //
  "mp_teams_unbalance_limit": (val) => true, // teams are unbalanced when one team has this many more players than the other team. (0 disables check)
  "mp_timelimit": (val) => true, // game time per map in minutes
  "mp_tournament": (val) => true, //
  "mp_usehwmmodels": (val) => true, // enable the use of the hw morph models. (-1 = never, 1 = always, 0 = based upon gpu)
  "mp_usehwmvcds": (val) => true, // enable the use of the hw morph vcd(s). (-1 = never, 1 = always, 0 = based upon gpu)
  "mp_wait_for_other_player_notconnecting_timeout": (val) => true, // maximum time that we wait in the transition loading screen after we fully loaded for partner to start loading.
  "mp_wait_for_other_player_timeout": (val) => true, // maximum time that we wait in the transition loading screen for the other player.
  "mp_waitingforplayers_cancel": (val) => true, // set to 1 to end the waitingforplayers period.
  "mp_waitingforplayers_restart": (val) => true, // set to 1 to start or restart the waitingforplayers period.
  "mp_waitingforplayers_time": (val) => true, // waitingforplayers time length in seconds
  "mp_weaponstay": (val) => true, //
  "mp_winlimit": (val) => true, // max score one team can reach before server changes maps
  "ms_player_dump_properties": (val) => false, // cmd prints a dump the current players property data
  "multvar": (val) => false, // cmd multiply specified convar value.
  "muzzleflash_light": (val) => true, //
  "name": (val) => true, // current user name
  "name2": (val) => true, // current user name
  "nav_add_to_selected_set": (val) => false, // cmd add current area to the selected set.
  "nav_add_to_selected_set_by_id": (val) => false, // cmd add specified area id to the selected set.
  "nav_analyze": (val) => false, // cmd re-analyze the current navigation mesh and save it to disk.
  "nav_area_bgcolor": (val) => val == 503316480, // rgba color to draw as the background color for nav areas while editing.
  "nav_area_max_size": (val) => val == 50, // max area size created in nav generation
  "nav_avoid": (val) => false, // cmd toggles the 'avoid this area when possible' flag used by the ai system.
  "nav_begin_area": (val) => false, // cmd defines a corner of a new area or ladder. to complete the area or ladder, drag the opposite corner to the desired location and
  "nav_begin_deselecting": (val) => false, // cmd start continuously removing from the selected set.
  "nav_begin_drag_deselecting": (val) => false, // cmd start dragging a selection area.
  "nav_begin_drag_selecting": (val) => false, // cmd start dragging a selection area.
  "nav_begin_selecting": (val) => false, // cmd start continuously adding to the selected set.
  "nav_begin_shift_xy": (val) => false, // cmd begin shifting the selected set.
  "nav_build_ladder": (val) => false, // cmd attempts to build a nav ladder on the climbable surface under the cursor.
  "nav_check_file_consistency": (val) => false, // cmd scans the maps directory and reports any missing/out-of-date navigation files.
  "nav_check_floor": (val) => false, // cmd updates the blocked/unblocked status for every nav area.
  "nav_check_stairs": (val) => false, // cmd update the nav mesh stairs attribute
  "nav_chop_selected": (val) => false, // cmd chops all selected areas into their component 1x1 areas
  "nav_clear_attribute": (val) => false, // cmd remove given nav attribute from all areas in the selected set.
  "nav_clear_selected_set": (val) => false, // cmd clear the selected set.
  "nav_clear_walkable_marks": (val) => false, // cmd erase any previously placed walkable positions.
  "nav_compress_id": (val) => false, // cmd re-orders area and ladder id's so they are continuous.
  "nav_connect": (val) => false, // cmd to connect two areas, mark the first area, highlight the second area, then invoke the connect command. note that this creates a
  "nav_coplanar_slope_limit": (val) => val == 0, //
  "nav_coplanar_slope_limit_displacement": (val) => val == 0, //
  "nav_corner_adjust_adjacent": (val) => val == 18, // radius used to raise/lower corners in nearby areas when raising/lowering corners.
  "nav_corner_lower": (val) => false, // cmd lower the selected corner of the currently marked area.
  "nav_corner_place_on_ground": (val) => false, // cmd places the selected corner of the currently marked area on the ground.
  "nav_corner_raise": (val) => false, // cmd raise the selected corner of the currently marked area.
  "nav_corner_select": (val) => false, // cmd select a corner of the currently marked area. use multiple times to access all four corners.
  "nav_create_area_at_feet": (val) => val == 0, // anchor nav_begin_area z to editing player's feet
  "nav_create_place_on_ground": (val) => val == 0, // if true, nav areas will be placed flush with the ground when created by hand.
  "nav_crouch": (val) => false, // cmd toggles the 'must crouch in this area' flag used by the ai system.
  "nav_debug_blocked": (val) => val == 0, //
  "nav_delete": (val) => false, // cmd deletes the currently highlighted area.
  "nav_delete_marked": (val) => false, // cmd deletes the currently marked area (if any).
  "nav_disconnect": (val) => false, // cmd to disconnect two areas, mark an area, highlight a second area, then invoke the disconnect command. this will remove all connec
  "nav_displacement_test": (val) => val == 10000, // checks for nodes embedded in displacements (useful for in-development maps)
  "nav_dont_hide": (val) => false, // cmd toggles the 'area is not suitable for hiding spots' flag used by the ai system.
  "nav_drag_selection_volume_zmax_offset": (val) => val == 32, // the offset of the nav drag volume top from center
  "nav_drag_selection_volume_zmin_offset": (val) => val == 32, // the offset of the nav drag volume bottom from center
  "nav_draw_limit": (val) => val == 500, // the maximum number of areas to draw in edit mode
  "nav_edit": (val) => val == 0, // set to one to interactively edit the navigation mesh. set to zero to leave edit mode.
  "nav_end_area": (val) => false, // cmd defines the second corner of a new area or ladder and creates it.
  "nav_end_deselecting": (val) => false, // cmd stop continuously removing from the selected set.
  "nav_end_drag_deselecting": (val) => false, // cmd stop dragging a selection area.
  "nav_end_drag_selecting": (val) => false, // cmd stop dragging a selection area.
  "nav_end_selecting": (val) => false, // cmd stop continuously adding to the selected set.
  "nav_end_shift_xy": (val) => false, // cmd finish shifting the selected set.
  "nav_flood_select": (val) => false, // cmd selects the current area and all areas connected to it, recursively. to clear a selection, use this command again.
  "nav_gen_cliffs_approx": (val) => false, // cmd mark cliff areas, post-processing approximation
  "nav_generate": (val) => false, // cmd generate a navigation mesh for the current map and save it to disk.
  "nav_generate_fencetops": (val) => val == 1, // autogenerate nav areas on fence and obstacle tops
  "nav_generate_fixup_jump_areas": (val) => val == 1, // convert obsolete jump areas into 2-way connections
  "nav_generate_incremental": (val) => false, // cmd generate a navigation mesh for the current map and save it to disk.
  "nav_generate_incremental_range": (val) => val == 2000, //
  "nav_generate_incremental_tolerance": (val) => val == 0, // z tolerance for adding new nav areas.
  "nav_jump": (val) => false, // cmd toggles the 'traverse this area by jumping' flag used by the ai system.
  "nav_ladder_flip": (val) => false, // cmd flips the selected ladder's direction.
  "nav_load": (val) => false, // cmd loads the navigation mesh for the current map.
  "nav_lower_drag_volume_max": (val) => false, // cmd lower the top of the drag select volume.
  "nav_lower_drag_volume_min": (val) => false, // cmd lower the bottom of the drag select volume.
  "nav_make_sniper_spots": (val) => false, // cmd chops the marked area into disconnected sub-areas suitable for sniper spots.
  "nav_mark": (val) => false, // cmd marks the area or ladder under the cursor for manipulation by subsequent editing commands.
  "nav_mark_attribute": (val) => false, // cmd set nav attribute for all areas in the selected set.
  "nav_mark_unnamed": (val) => false, // cmd mark an area with no place name. useful for finding stray areas missed when place painting.
  "nav_mark_walkable": (val) => false, // cmd mark the current location as a walkable position. these positions are used as seed locations when sampling the map to generate
  "nav_max_view_distance": (val) => val == 0, // maximum range for precomputed nav mesh visibility (0 = default 1500 units)
  "nav_max_vis_delta_list_length": (val) => val == 64, //
  "nav_merge": (val) => false, // cmd to merge two areas into one, mark the first area, highlight the second by pointing your cursor at it, and invoke the merge comm
  "nav_merge_mesh": (val) => false, // cmd merges a saved selected set into the current mesh.
  "nav_no_hostages": (val) => false, // cmd toggles the 'hostages cannot use this area' flag used by the ai system.
  "nav_no_jump": (val) => false, // cmd toggles the 'dont jump in this area' flag used by the ai system.
  "nav_place_floodfill": (val) => false, // cmd sets the place of the area under the cursor to the curent place, and 'flood-fills' the place to all adjacent areas. flood-filli
  "nav_place_list": (val) => false, // cmd lists all place names used in the map.
  "nav_place_pick": (val) => false, // cmd sets the current place to the place of the area under the cursor.
  "nav_place_replace": (val) => false, // cmd replaces all instances of the first place with the second place.
  "nav_place_set": (val) => false, // cmd sets the place of all selected areas to the current place.
  "nav_potentially_visible_dot_tolerance": (val) => val == 0, //
  "nav_precise": (val) => false, // cmd toggles the 'dont avoid obstacles' flag used by the ai system.
  "nav_quicksave": (val) => val == 1, // set to one to skip the time consuming phases of the analysis.  useful for data collection and testing.
  "nav_raise_drag_volume_max": (val) => false, // cmd raise the top of the drag select volume.
  "nav_raise_drag_volume_min": (val) => false, // cmd raise the bottom of the drag select volume.
  "nav_recall_selected_set": (val) => false, // cmd re-selects the stored selected set.
  "nav_remove_from_selected_set": (val) => false, // cmd remove current area from the selected set.
  "nav_remove_jump_areas": (val) => false, // cmd removes legacy jump areas, replacing them with connections.
  "nav_run": (val) => false, // cmd toggles the 'traverse this area by running' flag used by the ai system.
  "nav_save": (val) => false, // cmd saves the current navigation mesh to disk.
  "nav_save_selected": (val) => false, // cmd writes the selected set to disk for merging into another mesh via nav_merge_mesh.
  "nav_select_blocked_areas": (val) => false, // cmd adds all blocked areas to the selected set
  "nav_select_damaging_areas": (val) => false, // cmd adds all damaging areas to the selected set
  "nav_select_half_space": (val) => false, // cmd selects any areas that intersect the given half-space.
  "nav_select_invalid_areas": (val) => false, // cmd adds all invalid areas to the selected set.
  "nav_select_obstructed_areas": (val) => false, // cmd adds all obstructed areas to the selected set
  "nav_select_overlapping": (val) => false, // cmd selects nav areas that are overlapping others.
  "nav_select_radius": (val) => false, // cmd adds all areas in a radius to the selection set
  "nav_select_stairs": (val) => false, // cmd adds all stairway areas to the selected set
  "nav_selected_set_border_color": (val) => val == -16751516, // color used to draw the selected set borders while editing.
  "nav_selected_set_color": (val) => val == 1623785472, // color used to draw the selected set background while editing.
  "nav_set_place_mode": (val) => false, // cmd sets the editor into or out of place mode. place mode allows labelling of area with place names.
  "nav_shift": (val) => false, // cmd shifts the selected areas by the specified amount
  "nav_show_approach_points": (val) => val == 0, // show approach points in the navigation mesh.
  "nav_show_area_info": (val) => val == 0, // duration in seconds to show nav area id and attributes while editing
  "nav_show_compass": (val) => val == 0, //
  "nav_show_continguous": (val) => val == 0, // highlight non-contiguous connections
  "nav_show_danger": (val) => val == 0, // show current 'danger' levels.
  "nav_show_light_intensity": (val) => val == 0, //
  "nav_show_node_grid": (val) => val == 0, //
  "nav_show_node_id": (val) => val == 0, //
  "nav_show_nodes": (val) => val == 0, //
  "nav_show_player_counts": (val) => val == 0, // show current player counts in each area.
  "nav_show_potentially_visible": (val) => val == 0, // show areas that are potentially visible from the current nav area
  "nav_simplify_selected": (val) => false, // cmd chops all selected areas into their component 1x1 areas and re-merges them together into larger areas
  "nav_slope_limit": (val) => val == 0, // the ground unit normal's z component must be greater than this for nav areas to be generated.
  "nav_slope_tolerance": (val) => val == 0, // the ground unit normal's z component must be this close to the nav area's z component to be generated.
  "nav_snap_to_grid": (val) => val == 0, // snap to the nav generation grid when creating new nav areas
  "nav_solid_props": (val) => val == 0, // make props solid to nav generation/editing
  "nav_splice": (val) => false, // cmd to splice, mark an area, highlight a second area, then invoke the splice command to create a new, connected area between them.
  "nav_split": (val) => false, // cmd to split an area into two, align the split line using your cursor and invoke the split command.
  "nav_split_place_on_ground": (val) => val == 0, // if true, nav areas will be placed flush with the ground when split.
  "nav_stand": (val) => false, // cmd toggles the 'stand while hiding' flag used by the ai system.
  "nav_stop": (val) => false, // cmd toggles the 'must stop when entering this area' flag used by the ai system.
  "nav_store_selected_set": (val) => false, // cmd stores the current selected set for later retrieval.
  "nav_strip": (val) => false, // cmd strips all hiding spots, approach points, and encounter spots from the current area.
  "nav_subdivide": (val) => false, // cmd subdivides all selected areas.
  "nav_test_node": (val) => val == 0, //
  "nav_test_node_crouch": (val) => val == 0, //
  "nav_test_node_crouch_dir": (val) => val == 4, //
  "nav_test_stairs": (val) => false, // cmd test the selected set for being on stairs
  "nav_toggle_deselecting": (val) => false, // cmd start or stop continuously removing from the selected set.
  "nav_toggle_in_selected_set": (val) => false, // cmd remove current area from the selected set.
  "nav_toggle_place_mode": (val) => false, // cmd toggle the editor into and out of place mode. place mode allows labelling of area with place names.
  "nav_toggle_place_painting": (val) => false, // cmd toggles place painting mode. when place painting, pointing at an area will 'paint' it with the current place.
  "nav_toggle_selected_set": (val) => false, // cmd toggles all areas into/out of the selected set.
  "nav_toggle_selecting": (val) => false, // cmd start or stop continuously adding to the selected set.
  "nav_transient": (val) => false, // cmd toggles the 'area is transient and may become blocked' flag used by the ai system.
  "nav_unmark": (val) => false, // cmd clears the marked area or ladder.
  "nav_update_blocked": (val) => false, // cmd updates the blocked/unblocked status for every nav area.
  "nav_update_lighting": (val) => false, // cmd recomputes lighting values
  "nav_update_visibility_on_edit": (val) => val == 0, // if nonzero editing the mesh will incrementally recompue visibility
  "nav_use_place": (val) => false, // cmd if used without arguments, all available places will be listed. if a place argument is given, the current place is set.
  "nav_walk": (val) => false, // cmd toggles the 'traverse this area by walking' flag used by the ai system.
  "nav_warp_to_mark": (val) => false, // cmd warps the player to the marked area.
  "nav_world_center": (val) => false, // cmd centers the nav mesh in the world
  "nb_shadow_dist": (val) => true, //
  "net_allow_multicast": (val) => true, //
  "net_blockmsg": (val) => val == 0, // discards incoming message: <0|1|name>
  "net_channels": (val) => true, // cmd shows net channel info
  "net_compressvoice": (val) => true, // attempt to compress out of band voice payloads (360 only).
  "net_drawslider": (val) => true, // draw completion slider during signon
  "net_droppackets": (val) => val == 0, // drops next n packets on client
  "net_dumpeventstats": (val) => true, // cmd dumps out a report of game event network usage
  "net_dumptest": (val) => val == 0, //
  "net_earliertempents": (val) => val == 1, //
  "net_fakejitter": (val) => val == 0, // jitter fakelag packet time
  "net_fakelag": (val) => val == 0, // lag all incoming network data (including loopback) by this many milliseconds.
  "net_fakeloss": (val) => val == 0, // simulate packet loss as a percentage (negative means drop 1/n packets)
  "net_graph": (val) => true, // draw the network usage graph, = 2 draws data on payload, = 3 draws payload legend.
  "net_graphheight": (val) => true, // height of netgraph panel
  "net_graphmsecs": (val) => true, // the latency graph represents this many milliseconds.
  "net_graphpos": (val) => true, //
  "net_graphproportionalfont": (val) => true, // determines whether netgraph font is proportional or not
  "net_graphshowinterp": (val) => true, // draw the interpolation graph.
  "net_graphshowlatency": (val) => true, // draw the ping/packet loss graph.
  "net_graphsolid": (val) => true, //
  "net_graphtext": (val) => true, // draw text fields
  "net_maxcleartime": (val) => val == 4, // max # of seconds we can wait for next packets to be sent based on rate setting (0 == no limit).
  "net_maxfilesize": (val) => val == 16, // maximum allowed file size for uploading in mb
  "net_maxfragments": (val) => val == 1200, // max fragment bytes per packet
  "net_maxroutable": (val) => val == 1200, // requested max packet size before packets are 'split'.
  "net_megasnapshot": (val) => true, //
  "net_paranoid": (val) => true, //
  "net_public_adr": (val) => true, // for servers behind nat/dhcp meant to be exposed to the public internet, this is the public facing ip address string: ('x.x.x.x'
  "net_queue_trace": (val) => true, //
  "net_queued_packet_thread": (val) => true, // use a high priority thread to send queued packets out instead of sending them each frame.
  "net_scale": (val) => true, //
  "net_showeventlisteners": (val) => true, // show listening addition/removals
  "net_showevents": (val) => val == 0, // dump game events to console (1=client only, 2=all).
  "net_showfragments": (val) => true, // show netchannel fragments
  "net_showpeaks": (val) => true, // show messages for large packets only: <size>
  "net_showreliablesounds": (val) => true, //
  "net_showsplits": (val) => true, // show info about packet splits
  "net_showtcp": (val) => val == 0, // dump tcp stream summary to console
  "net_showudp": (val) => val == 0, // dump udp packets summary to console
  "net_showudp_oob": (val) => true, // dump oob udp packets summary to console
  "net_showudp_remoteonly": (val) => true, // dump non-loopback udp only
  "net_showusercmd": (val) => val == 0, // show user command encoding
  "net_splitpacket_maxrate": (val) => true, // max bytes per second when queueing splitpacket chunks
  "net_splitrate": (val) => true, // number of fragments for a splitpacket that can be sent per frame
  "net_start": (val) => true, // cmd inits multiplayer network sockets
  "net_status": (val) => true, // cmd shows current network status
  "net_steamcnx_allowrelay": (val) => true, // allow steam connections to attempt to use relay servers as fallback (best if specified on command line:  +net_steamcnx_allowrel
  "net_steamcnx_debug": (val) => true, // show debug spew for steam based connections, 2 shows all network traffic for steam sockets.
  "net_steamcnx_enabled": (val) => true, // use steam connections on listen server as a fallback, 2 forces use of steam connections instead of raw udp.
  "net_steamcnx_status": (val) => true, // cmd print status of steam connection sockets.
  "net_usesocketsforloopback": (val) => true, // use network sockets layer even for listen server local player's packets (multiplayer only).
  "next": (val) => val == 0, // set to 1 to advance to next frame ( when singlestep == 1 )
  "nextdemo": (val) => false, // cmd play next demo in sequence.
  "nextlevel": (val) => val == 0, // if set to a valid map name, will change to this map during the next changelevel
  "noclip": (val) => false, // cmd toggle. player becomes non-solid and flies.  optional argument of 0 or 1 to force enable/disable
  "noclip_fixup": (val) => val == 1, //
  "notarget": (val) => false, // cmd toggle. player becomes hidden to npcs.
  "npc_ally_deathmessage": (val) => val == 1, //
  "npc_ammo_deplete": (val) => false, // cmd subtracts half of the target's ammo
  "npc_bipass": (val) => false, // cmd displays the local movement attempts by the given npc(s) (triangulation detours).  failed bypass routes are displayed in red, s
  "npc_combat": (val) => false, // cmd displays text debugging information about the squad and enemy of the selected npc  (see overlay text)  arguments:    {npc_name}
  "npc_conditions": (val) => false, // cmd displays all the current ai conditions that an npc has in the overlay text.  arguments:    {npc_name} / {npc class_name} / no a
  "npc_create": (val) => false, // cmd creates an npc of the given type where the player is looking (if the given npc can actually stand at that location).    argumen
  "npc_create_aimed": (val) => false, // cmd creates an npc aimed away from the player of the given type where the player is looking (if the given npc can actually stand at
  "npc_create_equipment": (val) => val == 0, //
  "npc_destroy": (val) => false, // cmd removes the given npc(s) from the universe arguments:    {npc_name} / {npc_class_name} / no argument picks what player is looki
  "npc_destroy_unselected": (val) => false, // cmd removes all npcs from the universe that aren't currently selected
  "npc_enemies": (val) => false, // cmd shows memory of npc.  draws an x on top of each memory.  eluded entities drawn in blue (don't know where it went)  unreachable
  "npc_focus": (val) => false, // cmd displays red line to npc's enemy (if has one) and blue line to npc's target entity (if has one)  arguments:    {npc_name} / {np
  "npc_freeze": (val) => false, // cmd selected npc(s) will freeze in place (or unfreeze). if there are no selected npcs, uses the npc under the crosshair.  arguments
  "npc_freeze_unselected": (val) => false, // cmd freeze all npcs not selected
  "npc_go": (val) => false, // cmd selected npc(s) will go to the location that the player is looking (shown with a purple box)  arguments: -none-
  "npc_go_do_run": (val) => val == 1, // set whether should run on npc go
  "npc_go_random": (val) => false, // cmd sends all selected npc(s) to a random node.  arguments:    -none-
  "npc_heal": (val) => false, // cmd heals the target back to full health
  "npc_height_adjust": (val) => val == 1, // enable test mode for ik height adjustment
  "npc_kill": (val) => false, // cmd kills the given npc(s) arguments:    {npc_name} / {npc_class_name} / no argument picks what player is looking at
  "npc_nearest": (val) => false, // cmd draw's a while box around the npc(s) nearest node  arguments:    {entity_name} / {class_name} / no argument picks what player i
  "npc_relationships": (val) => false, // cmd displays the relationships between this npc and all others.  arguments:    {entity_name} / {class_name} / no argument picks wha
  "npc_reset": (val) => false, // cmd reloads schedules for all npc's from their script files  arguments: -none-
  "npc_route": (val) => false, // cmd displays the current route of the given npc as a line on the screen.  waypoints along the route are drawn as small cyan rectang
  "npc_select": (val) => false, // cmd select or deselects the given npc(s) for later manipulation.  selected npc's are shown surrounded by a red translucent box  arg
  "npc_sentences": (val) => val == 0, //
  "npc_set_freeze": (val) => false, // cmd selected npc(s) will freeze in place (or unfreeze). if there are no selected npcs, uses the npc under the crosshair.  arguments
  "npc_set_freeze_unselected": (val) => false, // cmd freeze all npcs not selected
  "npc_speakall": (val) => false, // cmd force the npc to try and speak all their responses
  "npc_squads": (val) => false, // cmd obsolete.  replaced by npc_combat
  "npc_steering": (val) => false, // cmd displays the steering obstructions of the npc (used to perform local avoidance)  arguments:    {entity_name} / {class_name} / n
  "npc_steering_all": (val) => false, // cmd displays the steering obstructions of all npcs (used to perform local avoidance)
  "npc_task_text": (val) => false, // cmd outputs text debugging information to the console about the all the tasks + break conditions of the selected npc current schedu
  "npc_tasks": (val) => false, // cmd displays detailed text debugging information about the all the tasks of the selected npc current schedule (see overlay text)  a
  "npc_teleport": (val) => false, // cmd selected npc will teleport to the location that the player is looking (shown with a purple box)  arguments: -none-
  "npc_thinknow": (val) => false, // cmd trigger npc to think
  "npc_viewcone": (val) => false, // cmd displays the viewcone of the npc (where they are currently looking and what the extents of there vision is)  arguments:    {ent
  "npc_vphysics": (val) => val == 0, //
  "old_radiusdamage": (val) => val == 0, //
  "open_econui": (val) => false, // cmd
  "open_econui_backpack": (val) => false, // cmd open the backpack.
  "open_econui_crafting": (val) => false, // cmd open the crafting screen.
  "open_store": (val) => false, // cmd open the in-game store
  "openserverbrowser": (val) => false, // cmd opens server browser
  "overview_alpha": (val) => val == 1, // overview map translucency.
  "overview_health": (val) => val == 1, // show player's health in map overview.
  "overview_locked": (val) => val == 1, // locks map angle, doesn't follow view angle.
  "overview_mode": (val) => false, // cmd sets overview map mode off,small,large: <0|1|2>
  "overview_names": (val) => val == 1, // show player's names in map overview.
  "overview_tracks": (val) => val == 1, // show player's tracks in map overview.
  "overview_zoom": (val) => false, // cmd sets overview map zoom: <zoom> [<time>] [rel]
  "paint_cleanser_visibility_look_angle": (val) => true, //
  "paint_cleanser_visibility_poll_rate": (val) => true, //
  "paint_cleanser_visibility_range": (val) => true, //
  "paint_color_max_diff": (val) => true, // the maximum difference between two colors for matching.
  "paint_impact_accumulate_sound_distance_threshold": (val) => true, //
  "paint_impact_count_to_max_adjusted_volume": (val) => true, //
  "paint_impact_count_to_min_adjusted_pitch_after_full_volume": (val) => true, //
  "paint_impact_particles_distance_threshold": (val) => true, //
  "paint_impact_particles_duration": (val) => true, //
  "paint_location_distance_threshold_square": (val) => val == 25, //
  "paint_max_impact_particles": (val) => true, //
  "paint_min_impact_particles": (val) => true, //
  "paintblob_air_drag": (val) => val == 0, // the air drag applied to the paint blobs.
  "paintblob_draw_distance_from_eye": (val) => true, //
  "paintblob_gravity_scale": (val) => val == 1, // the gravity scale of the paint blobs.
  "paintblob_isosurface_box_width": (val) => val == 8, //
  "paintblob_lifetime": (val) => val == 1, // the lifetime of the paintblobs if they have a limited range.
  "paintblob_limited_range": (val) => val == 0, // if the paintblobs have a limited range.
  "paintblob_max_radius_scale": (val) => val == 1, //
  "paintblob_min_radius_scale": (val) => val == 0, //
  "paintblob_minimum_portal_exit_velocity": (val) => val == 225, // the minimum velocity of the paint blobs on exiting portals.
  "paintblob_radius_while_streaking": (val) => val == 0, //
  "paintblob_streak_angle_threshold": (val) => val == 45, // the angle of impact below which the paint blobs will streak paint.
  "paintblob_streak_trace_range": (val) => val == 20, // the range of the trace for the paint blobs while streaking.
  "paintblob_tbeam_accel": (val) => val == 200, // the acceleration of the paint blobs while in a tractor beam to get up to tractor beam speed
  "paintblob_tbeam_portal_vortex_circulation": (val) => val == 60000, //
  "paintblob_tbeam_vortex_accel": (val) => val == 300, //
  "paintblob_tbeam_vortex_circulation": (val) => val == 30000, //
  "paintblob_tbeam_vortex_distance": (val) => val == 50, // blob will do vortex if blob's distance from start or end point of the beam is within this distance
  "paintblob_tbeam_vortex_radius_rate": (val) => val == 100, //
  "paintblob_update_per_second": (val) => val == 60, // the number of times the blobs movement code is run per second.
  "paintbomb_blobs_max_streak_speed_dampen": (val) => val == 800, //
  "paintbomb_blobs_max_streak_time": (val) => val == 0, //
  "paintbomb_blobs_min_streak_speed_dampen": (val) => val == 500, //
  "paintbomb_blobs_min_streak_time": (val) => val == 0, //
  "paintbomb_draw_blob_speed_max": (val) => true, //
  "paintbomb_draw_blob_speed_min": (val) => true, //
  "paintbomb_draw_max_blob_radius": (val) => true, //
  "paintbomb_draw_min_blob_radius": (val) => true, //
  "paintbomb_draw_num_paint_blobs": (val) => true, //
  "paintbomb_draw_sphere_radius": (val) => true, //
  "paintbomb_explosion_radius": (val) => val == 100, // radius of the trace from the center of the explosion
  "paintbomb_horizontal_angle_split": (val) => val == 8, //
  "paintbomb_streak_speed_max": (val) => val == 250, //
  "paintbomb_streak_speed_min": (val) => val == 150, //
  "paintbomb_vertical_angle_split": (val) => val == 8, //
  "paintsplat_bias": (val) => val == 0, // change bias value for computing circle buffer
  "paintsplat_max_alpha_noise": (val) => val == 0, // max noise value of circle alpha
  "paintsplat_noise_enabled": (val) => val == 1, //
  "panel_test_title_safe": (val) => val == 0, // test vgui panel positioning with title safe indentation
  "particle_sim_alt_cores": (val) => true, //
  "particle_simulateoverflow": (val) => true, // used for stress-testing particle systems. randomly denies creation of particles.
  "particle_test_attach_attachment": (val) => true, // attachment index for attachment mode
  "particle_test_attach_mode": (val) => true, // possible values: 'start_at_attachment', 'follow_attachment', 'start_at_origin', 'follow_origin'
  "particle_test_file": (val) => true, // name of the particle system to dynamically spawn
  "particle_test_start": (val) => true, // cmd dispatches the test particle system with the parameters specified in particle_test_file,  particle_test_attach_mode and particl
  "particle_test_stop": (val) => true, // cmd stops all particle systems on the selected entities.  arguments:    {entity_name} / {class_name} / no argument picks what playe
  "password": (val) => true, // current server access password
  "path": (val) => true, // cmd show the engine filesystem path.
  "pause": (val) => true, // cmd toggle the server pause state.
  "perfui": (val) => true, // cmd show/hide the level performance tools ui.
  "perfvisualbenchmark": (val) => false, // cmd
  "perfvisualbenchmark_abort": (val) => false, // cmd
  "phonemedelay": (val) => true, // phoneme delay to account for sound system latency.
  "phonemefilter": (val) => true, // time duration of box filter to pass over phonemes.
  "phonemesnap": (val) => true, // lod at level at which visemes stops always considering two phonemes, regardless of duration.
  "phys_debug_check_contacts": (val) => val == 0, //
  "phys_enable_query_cache": (val) => val == 1, //
  "phys_impactforcescale": (val) => val == 1, //
  "phys_penetration_error_time": (val) => true, // controls the duration of vphysics penetration error boxes.
  "phys_pushscale": (val) => val == 1, //
  "phys_show_active": (val) => val == 0, //
  "phys_speeds": (val) => val == 0, //
  "phys_stressbodyweights": (val) => val == 5, //
  "phys_timescale": (val) => val == 1, // scale time for physics
  "phys_upimpactforcescale": (val) => val == 0, //
  "physcannon_maxforce": (val) => val == 1500, //
  "physcannon_maxmass": (val) => val == 250, //
  "physcannon_mega_enabled": (val) => val == 0, //
  "physcannon_minforce": (val) => val == 700, //
  "physcannon_tracelength": (val) => val == 250, //
  "physics_budget": (val) => false, // cmd times the cost of each active object
  "physics_constraints": (val) => false, // cmd highlights constraint system graph for an entity
  "physics_debug_entity": (val) => false, // cmd dumps debug info for an entity
  "physics_highlight_active": (val) => false, // cmd turns on the absbox for all active physics objects
  "physics_report_active": (val) => false, // cmd lists all active physics objects
  "physics_select": (val) => false, // cmd dumps debug info for an entity
  "physicsshadowupdate_render": (val) => val == 0, //
  "physpmc": (val) => val == 0, //
  "picker": (val) => false, // cmd toggles 'picker' mode.  when picker is on, the bounding box, pivot and debugging text is displayed for whatever entity the play
  "ping": (val) => true, // cmd display ping to server.
  "ping_max_green": (val) => true, //
  "ping_max_red": (val) => true, //
  "ping_max_yellow": (val) => true, //
  "pingserver": (val) => true, // cmd ping a server for info
  "pipeline_static_props": (val) => val == 1, //
  "pixelvis_debug": (val) => false, // cmd dump debug info
  "play": (val) => true, // cmd play a sound.
  "playdemo": (val) => false, // cmd play a recorded demo file (.dem ).
  "player_debug_print_damage": (val) => val == 0, // when true, print amount and type of all damage received by player to console.
  "player_held_object_collide_with_player": (val) => val == 0, // should held objects collide with players
  "player_held_object_debug_error": (val) => val == 0, // spew information on dropping objects due to error
  "player_held_object_keep_out_of_camera": (val) => val == 1, //
  "player_held_object_max_knock_magnitude": (val) => val == 30, // for viewmodel grab controller, max velocity magnitude squared to apply to knocked objects.
  "player_held_object_max_throw_magnitude": (val) => val == 60, // for viewmodel grab controller, max velocity magnitude squared to apply to knocked objects.
  "player_held_object_transform_bump_ray": (val) => val == 0, //
  "player_held_object_use_view_model": (val) => val == -1, // use clone models in the view model instead of physics simulated grab controller.
  "player_old_armor": (val) => val == 0, //
  "player_paint_shoot_pos_forward_scale": (val) => val == 55, //
  "player_paint_shoot_pos_right_scale": (val) => val == 12, //
  "player_paint_shoot_pos_up_scale": (val) => val == 25, //
  "player_throwforce": (val) => val == 1000, //
  "playflush": (val) => true, // cmd play a sound, reloading from disk in case of changes.
  "playgamesound": (val) => true, // cmd play a sound from the game sounds txt file
  "playsoundscape": (val) => true, // cmd forces a soundscape to play
  "playtest_random_death": (val) => val == 0, //
  "playvideo": (val) => false, // cmd plays a video: <filename> [width height]
  "playvideo_end_level_transition": (val) => false, // cmd plays a video fullscreen without ability to skip (unless dev 1) and fades in: <filename> <time>
  "playvideo_exitcommand": (val) => false, // cmd plays a video and fires and exit command when it is stopped or finishes: <filename> <exit command>
  "playvideo_exitcommand_nointerrupt": (val) => false, // cmd plays a video (without interruption) and fires and exit command when it is stopped or finishes: <filename> <exit command>
  "playvideo_nointerrupt": (val) => false, // cmd plays a video without ability to skip: <filename> [width height]
  "playvol": (val) => true, // cmd play a sound at a specified volume.
  "plugin_load": (val) => false, // cmd plugin_load <filename>
  "plugin_pause": (val) => false, // cmd plugin_pause <index>
  "plugin_pause_all": (val) => false, // cmd pauses all loaded plugins
  "plugin_print": (val) => false, // cmd prints details about loaded plugins
  "plugin_unload": (val) => false, // cmd plugin_unload <index>
  "plugin_unpause": (val) => false, // cmd plugin_unpause <index>
  "plugin_unpause_all": (val) => false, // cmd unpauses all disabled plugins
  "portal2_portal_width": (val) => val == 72, //
  "portal2_square_portals": (val) => val == 0, //
  "portal_beamtrace_optimization": (val) => val == 1, //
  "portal_carve_vphysics_clips": (val) => val == 1, //
  "portal_clone_displacements": (val) => val == 0, //
  "portal_demohack": (val) => true, // do the demo_legacy_rollback setting to help during demo playback of going through portals.
  "portal_draw_ghosting": (val) => true, //
  "portal_environment_radius": (val) => val == 75, //
  "portal_funnel_debug": (val) => val == 0, //
  "portal_ghost_show_bbox": (val) => val == 0, // render aabbs around the bounding box used for ghost renderable bounds checking (either hitbox or collision aabb)
  "portal_ghost_use_network_origin": (val) => val == 0, // use the network origin for determining bounds in which to ghost renderables, rather than the abs origin.
  "portal_ghosts_disable": (val) => true, // disables rendering of ghosted objects in portal environments
  "portal_paint_color": (val) => true, // color for portal paint
  "portal_place": (val) => false, // cmd places a portal. indicate the group #, then the portal #, then pos + angle
  "portal_player_interaction_quadtest_epsilon": (val) => val == 0, //
  "portal_pointpush_debug": (val) => val == 0, // debug the portal_pointpush.
  "portal_pointpush_think_rate": (val) => val == 0, // the amount of time between thinks for the portal_pointpush.
  "portal_report": (val) => false, // cmd reports the location of all portals
  "portal_test_resting_surface_for_paint": (val) => val == 0, // test if a portal is on a white painted surface and fizzle if it goes away.  test it every frame.
  "portal_trace_shrink_ray_each_query": (val) => val == 0, //
  "portal_transmit_light": (val) => true, //
  "portal_use_player_avoidance": (val) => val == 0, //
  "portal_viewmodel_offset": (val) => true, //
  "portal_viewmodel_radius": (val) => true, //
  "portal_viewmodel_use_dlight": (val) => true, //
  "portalgun_fire_delay": (val) => val == 0, //
  "portalgun_held_button_fire_fire_delay": (val) => val == 0, //
  "portals_resizeall": (val) => false, // cmd resizes all portals (for testing), portals_resizeall [half width] [half height]
  "+posedebug": (val) => false, // cmd turn on pose debugger or add ents to pose debugger ui
  "-posedebug": (val) => false, // cmd turn off pose debugger or hide ents from pose debugger ui
  "prevent_crouch_jump": (val) => val == 1, // enable/disable crouch jump prevention.
  "print_colorcorrection": (val) => true, // cmd display the color correction layer information.
  "procedural_generator_debug": (val) => val == 0, //
  "procedural_generator_laser_catcher_at_different_height": (val) => val == 0, //
  "procedural_generator_laser_catcher_at_same_height": (val) => val == 1, //
  "procedural_generator_solve_it": (val) => false, // cmd solve the procedural puzzle generator.
  "procedural_generator_test": (val) => false, // cmd test the procedural puzzle generator.
  "procedural_surface_map": (val) => false, // cmd
  "progress_enable": (val) => false, // cmd
  "prop_active_gib_limit": (val) => true, //
  "prop_active_gib_max_fade_time": (val) => true, //
  "prop_break_disable_float": (val) => val == 1, //
  "prop_crosshair": (val) => false, // cmd shows name for prop looking at
  "prop_debug": (val) => false, // cmd toggle prop debug mode. if on, props will show colorcoded bounding boxes. red means ignore all damage. white means respond phys
  "prop_dynamic_create": (val) => false, // cmd creates a dynamic prop with a specific .mdl aimed away from where the player is looking.  arguments: {.mdl name}
  "prop_physics_create": (val) => false, // cmd creates a physics prop with a specific .mdl aimed away from where the player is looking.  arguments: {.mdl name}
  "props_break_max_pieces": (val) => true, // maximum prop breakable piece count (-1 = model default)
  "props_break_max_pieces_perframe": (val) => true, // maximum prop breakable piece count per frame (-1 = model default)
  "puzzlemaker_autosave_dev": (val) => false, // cmd puzzlemaker_autosave_dev  -  autosaves the current puzzle as 'autosave.p2c'
  "puzzlemaker_compile_and_preview": (val) => false, // cmd
  "puzzlemaker_compile_and_publish": (val) => false, // cmd
  "puzzlemaker_current_hint": (val) => true, //
  "puzzlemaker_drawselectionmeshes": (val) => true, // draw wireframe item selection meshes in red
  "puzzlemaker_enable_budget_bar": (val) => true, // shows/hides the budget bar
  "puzzlemaker_export": (val) => false, // cmd puzzlemaker_export <name>  -  export the current puzzle as 'name.vmf'
  "puzzlemaker_load_dev": (val) => false, // cmd puzzlemaker_load_dev <name>  -  load the puzzle called 'name.p2c'
  "puzzlemaker_new_chamber": (val) => false, // cmd
  "puzzlemaker_open_chamber": (val) => false, // cmd
  "puzzlemaker_play_sounds": (val) => true, // sets if the puzzlemaker can play sounds or not
  "puzzlemaker_publish_dev": (val) => false, // cmd puzzlemaker_publish_dev  -  compile the current puzzle and publish it to the steam workshop (via the standlone publishing tool)
  "puzzlemaker_quit": (val) => false, // cmd
  "puzzlemaker_request_publish": (val) => false, // cmd
  "puzzlemaker_save_chamber": (val) => false, // cmd
  "puzzlemaker_save_dev": (val) => false, // cmd puzzlemaker_save_dev <name>  -  save the current puzzle as 'name.p2c'
  "puzzlemaker_shadows": (val) => true, // enable shadows in the portal 2 puzzle maker
  "puzzlemaker_show": (val) => true, // 1 shows the puzzle maker,  0 hides it
  "puzzlemaker_show_budget_numbers": (val) => true, // shows the current values for all the different map limits.
  "puzzlemaker_show_overlay_web_page": (val) => false, // cmd
  "puzzlemaker_switch_session": (val) => false, // cmd
  "puzzlemaker_zoom_to_mouse": (val) => true, // 0-zoom to center of screen, 1-zoom to mouse cursor (smart), 2-zoom to mouse cursor (simple)
  "pwatchent": (val) => val == -1, // entity to watch for prediction system changes.
  "pwatchvar": (val) => val == 0, // entity variable to watch in prediction system for changes.
  "+quick_ping": (val) => false, // cmd ping the center option from the ping menu.
  "-quick_ping": (val) => false, // cmd quick ping is unpressed... nothing to do here.
  "quit": (val) => false, // cmd exit the engine.
  "r_3dsky": (val) => true, // enable the rendering of 3d sky boxes
  "r_airboatviewdampendamp": (val) => true, //
  "r_airboatviewdampenfreq": (val) => true, //
  "r_airboatviewzheight": (val) => true, //
  "r_alphafade_usefov": (val) => true, // account for fov when computing an entity's distance-based alpha fade
  "r_ambientboost": (val) => true, // set to boost ambient term if it is totally swamped by local lights
  "r_ambientfactor": (val) => true, // boost ambient cube by no more than this factor
  "r_ambientfraction": (val) => true, // fraction of direct lighting used to boost lighting when model requests
  "r_ambientlightingonly": (val) => true, // set this to 1 to light models with only ambient lighting (and no static lighting).
  "r_ambientmin": (val) => true, // threshold above which ambient cube will not boost (i.e. it's already sufficiently bright
  "r_aspectratio": (val) => true, //
  "r_avglight": (val) => true, //
  "r_avglightmap": (val) => true, //
  "r_bloomtintb": (val) => true, //
  "r_bloomtintexponent": (val) => true, //
  "r_bloomtintg": (val) => true, //
  "r_bloomtintr": (val) => true, //
  "r_brush_queue_mode": (val) => true, //
  "r_buildingmapforworld": (val) => true, //
  "r_cheapwaterend": (val) => true, // cmd
  "r_cheapwaterstart": (val) => true, // cmd
  "r_cleardecals": (val) => true, // cmd usage r_cleardecals <permanent>.
  "r_clipareafrustums": (val) => true, //
  "r_clipareaportals": (val) => true, //
  "r_colorstaticprops": (val) => true, //
  "r_debug_sequencesets": (val) => true, //
  "r_debugcheapwater": (val) => true, //
  "r_debugrandomstaticlighting": (val) => true, // set to 1 to randomize static lighting for debugging.  must restart for change to take affect.
  "r_decal_cover_count": (val) => true, //
  "r_decal_overlap_area": (val) => true, //
  "r_decal_overlap_count": (val) => true, //
  "r_decals": (val) => true, //
  "r_decalstaticprops": (val) => true, // decal static props test
  "r_deferopaquefastclipped": (val) => true, //
  "r_depthoverlay": (val) => val == 0, // replaces opaque objects with their grayscaled depth values. r_showz_power scales the output.
  "r_dispbuildable": (val) => val == 0, //
  "r_dispwalkable": (val) => val == 0, //
  "r_dlightsenable": (val) => true, //
  "r_dopixelvisibility": (val) => true, //
  "r_drawallrenderables": (val) => true, // draw all renderables, even ones inside solid leaves.
  "r_drawbatchdecals": (val) => true, // render decals batched.
  "r_drawbeams": (val) => val == 1, // 0=off, 1=normal, 2=wireframe
  "r_drawbrushmodels": (val) => val == 1, // render brush models. 0=off, 1=normal, 2=wireframe
  "r_drawclipbrushes": (val) => val == 0, // draw clip brushes (red=npc+player, pink=player, purple=npc)
  "r_drawdecals": (val) => true, // render decals.
  "r_drawdetailprops": (val) => val == 1, // 0=off, 1=normal, 2=wireframe
  "r_drawdisp": (val) => val == 1, // toggles rendering of displacment maps
  "r_drawentities": (val) => val == 1, //
  "r_drawflecks": (val) => val == 1, //
  "r_drawfuncdetail": (val) => val == 1, // render func_detail
  "r_drawleaf": (val) => val == -1, // draw the specified leaf.
  "r_drawlightcache": (val) => val == 0, // 0: off 1: draw light cache entries 2: draw rays
  "r_drawlightinfo": (val) => val == 0, //
  "r_drawlights": (val) => true, //
  "r_drawmodeldecals": (val) => true, //
  "r_drawmodellightorigin": (val) => true, //
  "r_drawmodelstatsoverlay": (val) => true, //
  "r_drawmodelstatsoverlaydistance": (val) => true, //
  "r_drawmodelstatsoverlayfilter": (val) => true, //
  "r_drawmodelstatsoverlaymax": (val) => true, // time in milliseconds beyond which a model overlay is fully red in r_drawmodelstatsoverlay 2
  "r_drawmodelstatsoverlaymin": (val) => true, // time in milliseconds that a model must take to render before showing an overlay in r_drawmodelstatsoverlay 2
  "r_drawopaquerenderables": (val) => val == 1, //
  "r_drawopaqueworld": (val) => val == 1, //
  "r_drawothermodels": (val) => val == 1, // 0=off, 1=normal, 2=wireframe
  "r_drawparticles": (val) => val == 1, // enable/disable particle rendering
  "r_drawpixelvisibility": (val) => val == 0, // show the occlusion proxies
  "r_drawportalfrustum": (val) => val == 0, //
  "r_drawportals": (val) => val == 0, //
  "r_drawrain": (val) => true, // enable/disable rain rendering.
  "r_drawrenderboxes": (val) => val == 0, //
  "r_drawropes": (val) => val == 1, //
  "r_drawscreenoverlay": (val) => true, //
  "r_drawskybox": (val) => true, //
  "r_drawspecificstaticprop": (val) => val == -1, //
  "r_drawsprites": (val) => val == 1, //
  "r_drawstaticprops": (val) => val == 1, // 0=off, 1=normal, 2=wireframe
  "r_drawtracers": (val) => val == 1, //
  "r_drawtracers_firstperson": (val) => true, //
  "r_drawtranslucentrenderables": (val) => val == 1, //
  "r_drawtranslucentworld": (val) => val == 1, //
  "r_drawunderwateroverlay": (val) => val == 0, //
  "r_drawvgui": (val) => true, // enable the rendering of vgui panels
  "r_drawviewmodel": (val) => true, //
  "r_drawworld": (val) => val == 1, // render the world.
  "r_dscale_basefov": (val) => true, //
  "r_dscale_fardist": (val) => true, //
  "r_dscale_farscale": (val) => true, //
  "r_dscale_neardist": (val) => true, //
  "r_dscale_nearscale": (val) => true, //
  "r_dynamic": (val) => true, //
  "r_dynamiclighting": (val) => true, //
  "r_emulategl": (val) => true, //
  "r_entityclips": (val) => true, //
  "r_eyeglintlodpixels": (val) => true, // the number of pixels wide an eyeball has to be before rendering an eyeglint.  is a floating point value.
  "r_eyegloss": (val) => true, //
  "r_eyemove": (val) => true, //
  "r_eyes": (val) => true, //
  "r_eyeshift_x": (val) => true, //
  "r_eyeshift_y": (val) => true, //
  "r_eyeshift_z": (val) => true, //
  "r_eyesize": (val) => true, //
  "r_eyewaterepsilon": (val) => true, //
  "r_fade360style": (val) => true, //
  "r_farz": (val) => true, // override the far clipping plane. -1 means to use the value in env_fog_controller.
  "r_fastreflectionfastpath": (val) => true, //
  "r_fastzreject": (val) => true, // activate/deactivates a fast z-setting algorithm to take advantage of hardware with fast z reject. use -1 to default to hardware
  "r_fastzrejectdisp": (val) => true, // activates/deactivates fast z rejection on displacements (360 only). only active when r_fastzreject is on.
  "r_flashlight_always_cull_for_single_pass": (val) => true, //
  "r_flashlight_info": (val) => true, // information about currently enabled flashlights
  "r_flashlight_topdown": (val) => true, //
  "r_flashlightambient": (val) => true, //
  "r_flashlightbacktraceoffset": (val) => true, //
  "r_flashlightbrightness": (val) => true, //
  "r_flashlightclip": (val) => true, //
  "r_flashlightconstant": (val) => true, //
  "r_flashlightculldepth": (val) => true, //
  "r_flashlightdepth_drawtranslucents": (val) => true, //
  "r_flashlightdepthres": (val) => true, //
  "r_flashlightdepthreshigh": (val) => true, //
  "r_flashlightdepthtexture": (val) => true, //
  "r_flashlightdetailprops": (val) => true, // enable a flashlight drawing pass on detail props. 0 = off, 1 = single pass, 2 = multipass (multipass is pc only)
  "r_flashlightdrawclip": (val) => true, //
  "r_flashlightdrawdepth": (val) => true, //
  "r_flashlightdrawdepthres": (val) => true, //
  "r_flashlightdrawfrustum": (val) => true, //
  "r_flashlightdrawfrustumbbox": (val) => true, //
  "r_flashlightdrawsweptbbox": (val) => true, //
  "r_flashlightenableculling": (val) => true, // enable frustum culling of flashlights
  "r_flashlightfar": (val) => true, //
  "r_flashlightfov": (val) => true, //
  "r_flashlightladderdist": (val) => true, //
  "r_flashlightlinear": (val) => true, //
  "r_flashlightlockposition": (val) => true, //
  "r_flashlightmodels": (val) => true, //
  "r_flashlightmuzzleflashfov": (val) => true, //
  "r_flashlightnear": (val) => true, //
  "r_flashlightnearoffsetscale": (val) => true, //
  "r_flashlightnodraw": (val) => true, //
  "r_flashlightoffsetforward": (val) => true, //
  "r_flashlightoffsetright": (val) => true, //
  "r_flashlightoffsetup": (val) => true, //
  "r_flashlightquadratic": (val) => true, //
  "r_flashlightrender": (val) => true, //
  "r_flashlightrendermodels": (val) => true, //
  "r_flashlightrenderworld": (val) => true, //
  "r_flashlightscissor": (val) => true, //
  "r_flashlightshadowatten": (val) => true, //
  "r_flashlighttracedistcutoff": (val) => true, //
  "r_flashlightupdatedepth": (val) => true, //
  "r_flashlightvisualizetrace": (val) => true, //
  "r_flashlightvolumetrics": (val) => true, //
  "r_flex": (val) => true, //
  "r_flushlod": (val) => false, // cmd flush and reload lods.
  "r_forcecheapwater": (val) => true, // force all water to be cheap water, will show old renders if enabled after water has been seen
  "r_forcerestore": (val) => true, //
  "r_forcewaterleaf": (val) => true, // enable for optimization to water - considers view in leaf under water for purposes of culling
  "r_frustumcullworld": (val) => true, //
  "r_glint_alwaysdraw": (val) => true, //
  "r_glint_procedural": (val) => true, //
  "r_hidepaintedsurfaces": (val) => val == 0, // if enabled, hides all surfaces which have been painted.
  "r_highlight_translucent_renderables": (val) => val == 0, //
  "r_hunkalloclightmaps": (val) => true, //
  "r_hwmorph": (val) => true, //
  "r_impacts_alt_orientation": (val) => true, //
  "r_itemblinkmax": (val) => true, //
  "r_itemblinkrate": (val) => true, //
  "r_jeepfov": (val) => true, //
  "r_jeepviewblendto": (val) => true, //
  "r_jeepviewblendtoscale": (val) => true, //
  "r_jeepviewblendtotime": (val) => true, //
  "r_jeepviewdampendamp": (val) => true, //
  "r_jeepviewdampenfreq": (val) => true, //
  "r_jeepviewzheight": (val) => true, //
  "r_jiggle_bones": (val) => true, //
  "r_keepstyledlightmapsonly": (val) => true, //
  "r_lightaverage": (val) => true, // activates/deactivate light averaging
  "r_lightcache_invalidate": (val) => true, // cmd
  "r_lightcache_numambientsamples": (val) => true, // number of random directions to fire rays when computing ambient lighting
  "r_lightcache_radiusfactor": (val) => true, // allow lights to influence lightcaches beyond the lights' radii
  "r_lightcache_zbuffercache": (val) => true, //
  "r_lightcachecenter": (val) => true, //
  "r_lightcachemodel": (val) => true, //
  "r_lightinterp": (val) => true, // controls the speed of light interpolation, 0 turns off interpolation
  "r_lightmap": (val) => true, //
  "r_lightstyle": (val) => true, //
  "r_lightwarpidentity": (val) => true, //
  "r_lockportalfrustum": (val) => true, //
  "r_lockpvs": (val) => true, // lock the pvs so you can fly around and inspect what is being drawn.
  "r_lod": (val) => true, //
  "r_lod_switch_scale": (val) => true,
  "r_mapextents": (val) => true, // set the max dimension for the map.  this determines the far clipping plane
  "r_maxdlights": (val) => true, //
  "r_maxmodeldecal": (val) => true, //
  "r_maxnewsamples": (val) => true, //
  "r_maxsampledist": (val) => true, //
  "r_minnewsamples": (val) => true, //
  "r_modelwireframedecal": (val) => true, //
  "r_nohw": (val) => val == 0, //
  "r_norefresh": (val) => val == 0, //
  "r_nosw": (val) => val == 0, //
  "r_novis": (val) => val == 0, // turn off the pvs.
  "r_occludeemaxarea": (val) => true, // prevents occlusion testing for entities that take up more than x% of the screen. 0 means use whatever the level said to use.
  "r_occluderminarea": (val) => true, // prevents this occluder from being used if it takes up less than x% of the screen. 0 means use whatever the level said to use.
  "r_occludermincount": (val) => true, // at least this many occluders will be used, no matter how big they are.
  "r_occlusion": (val) => true, // activate/deactivate the occlusion system.
  "r_occlusionspew": (val) => true, // activate/deactivates spew about what the occlusion system is doing.
  "r_oldlightselection": (val) => true, // set this to revert to hl2's method of selecting lights
  "r_overlayfadeenable": (val) => true, //
  "r_overlayfademax": (val) => true, //
  "r_overlayfademin": (val) => true, //
  "r_overlaywireframe": (val) => val == 0, //
  "r_paintblob_blr_cutoff_radius": (val) => true, // set cutoff radius (how far field extends from each particle)
  "r_paintblob_blr_render_radius": (val) => true, // set render radius (how far from particle center surface will be)
  "r_paintblob_blr_scale": (val) => true, // scale all surface rendering parameters.
  "r_paintblob_calc_color": (val) => true, // just interpolate colors
  "r_paintblob_calc_hifreq_color": (val) => true, // experimental hi-freq colors
  "r_paintblob_calc_tan_only": (val) => true, // calculate only tangents
  "r_paintblob_calc_tile_color": (val) => true, // shows color of the tile
  "r_paintblob_calc_uv_and_tan": (val) => true, // calculate uvs and tangents
  "r_paintblob_debug_draw_margin": (val) => true, // if tiler is disabled, whether to draw the margin.
  "r_paintblob_debug_draw_tile_boundaries": (val) => true, // whether to draw outlines of all tiles.
  "r_paintblob_debug_spu": (val) => true, // set this to 1 to break in the spu code for the blob. otherwise use 0.
  "r_paintblob_display_clip_box": (val) => true, //
  "r_paintblob_draw_isosurface": (val) => true, // draws the surface as an isosurface
  "r_paintblob_force_single_pass": (val) => true, // if 0, render the blob in two passes. set to 1 to force rendering of the blob in a single pass.
  "r_paintblob_highres_cube": (val) => true, // set cubewidth (coarseness of the mesh)
  "r_paintblob_mainview_highres": (val) => true, // if 1, make the main view high resolution. set to 0 to make the main view low resolution.
  "r_paintblob_material": (val) => true, // choose a material from 0 to n
  "r_paintblob_max_number_of_indices_displayed": (val) => true, // indicates the maximum number of indices to display per tile. the index size will be the limiting factor though (regardless of t
  "r_paintblob_max_number_of_threads": (val) => true, // indicates the maximum number of threads that will be spawn for the blob.
  "r_paintblob_max_number_of_vertices_displayed": (val) => true, // indicates the maximum number of vertices to display per tile. the vb size will be the limiting factor though (regardless of thi
  "r_paintblob_only_mainview_displayed": (val) => true, // if 0, other views are displayed (portal, shadow, reflection, ...). note that shadows are disabled on game consoles. set to 1 to
  "r_paintblob_otherviews_highres": (val) => true, // if 0, all other views are low resolution. set to 1 to make other views high resolution.
  "r_paintblob_rotate": (val) => true, // whether to rotate for transparency
  "r_paintblob_seeding_with_simd": (val) => true, // set this to 1 to run the seeding in simd. otherwise use 0.
  "r_paintblob_shader": (val) => true, // choose a shader
  "r_paintblob_tile_index_to_draw": (val) => true, // -1 to display all tiles. otherwise the index of the tile to draw.
  "r_paintblob_timeout_for_recycling_fragments": (val) => true, // timeout in milliseconds used to recycle the fragments. default is 64 in release, 1000 in debug.
  "r_paintblob_use_optimized_fragment_copy": (val) => true, // indicates if optimized vb/ib copy is enabled (write-combine memory optimization).
  "r_paintblob_wireframe": (val) => true, // draw wireframe
  "r_particle_demo": (val) => true, //
  "r_particle_sim_spike_threshold_ms": (val) => true, //
  "r_particle_timescale": (val) => true, //
  "r_partition_level": (val) => true, // displays a particular level of the spatial partition system. use -1 to disable it.
  "r_physpropstaticlighting": (val) => true, //
  "r_pix_recordframes": (val) => true, //
  "r_pix_start": (val) => true, //
  "r_pixelfog": (val) => true, //
  "r_pixelvisibility_partial": (val) => true, //
  "r_pixelvisibility_spew": (val) => true, //
  "r_portal_earlyz": (val) => true, //
  "r_portal_fastpath": (val) => true, //
  "r_portal_fastpath_max_ghost_recursion": (val) => true, //
  "r_portal_stencil_depth": (val) => true, // when using stencil views, this changes how many views within views we see
  "r_portal_use_complex_frustums": (val) => true, // view optimization, turn this off if you get odd visual bugs.
  "r_portal_use_dlights": (val) => true, //
  "r_portal_use_pvs_optimization": (val) => true, // enables an optimization that allows portals to be culled when outside of the pvs.
  "r_portalscissor": (val) => true, //
  "r_portalscloseall": (val) => val == 0, //
  "r_portalsopenall": (val) => val == 0, // open all portals
  "r_portalstencildisable": (val) => true, //
  "r_portaltestents": (val) => true, // clip entities against portal frustums.
  "r_printdecalinfo": (val) => true, // cmd
  "r_proplightingfromdisk": (val) => true, // 0=off, 1=on, 2=show errors
  "r_proplightingpooling": (val) => true, // 0 - off, 1 - static prop color meshes are allocated from a single shared vertex buffer (on hardware that supports stream offset
  "r_propsmaxdist": (val) => val == 1200, // maximum visible distance
  "r_queued_decals": (val) => true, // offloads a bit of decal rendering setup work to the material system queue when enabled.
  "r_queued_post_processing": (val) => true, //
  "r_queued_ropes": (val) => true, //
  "r_radiosity": (val) => true, // 0: no radiosity 1: radiosity with ambient cube (6 samples) 2: radiosity with 162 samples 3: 162 samples for static props, 6 sam
  "r_rainallowinsplitscreen": (val) => true, // allows rain in splitscreen
  "r_rainalpha": (val) => true, //
  "r_rainalphapow": (val) => true, //
  "r_raincheck": (val) => true, // enable/disable isinair() check for rain drops?
  "r_raindebugduration": (val) => true, // shows rain tracelines for this many seconds (0 disables)
  "r_raindensity": (val) => true, //
  "r_rainhack": (val) => true, //
  "r_rainlength": (val) => true, //
  "r_rainparticledensity": (val) => true, // density of particle rain 0-1
  "r_rainprofile": (val) => true, // enable/disable rain profiling.
  "r_rainradius": (val) => true, //
  "r_rainsidevel": (val) => true, // how much sideways velocity rain gets.
  "r_rainsimulate": (val) => true, // enable/disable rain simulation.
  "r_rainspeed": (val) => true, //
  "r_rainsplashpercentage": (val) => true, //
  "r_rainwidth": (val) => true, //
  "r_randomflex": (val) => true, //
  "r_renderoverlayfragment": (val) => true, //
  "r_rimlight": (val) => true, //
  "r_rootlod": (val) => true, // root lod
  "r_ropetranslucent": (val) => true, //
  "r_screenoverlay": (val) => false, // cmd draw specified material as an overlay
  "r_sequence_debug": (val) => true, //
  "r_shader_srgb": (val) => true, // -1 = use hardware caps. 0 = use hardware srgb. 1 = use shader srgb(software lookup)
  "r_shadow_debug_spew": (val) => true, //
  "r_shadow_deferred": (val) => true, // toggle deferred shadow rendering
  "r_shadow_deferred_downsample": (val) => true, // toggle low-res deferred shadow rendering
  "r_shadow_deferred_simd": (val) => true, //
  "r_shadow_half_update_rate": (val) => true, // updates shadows at half the framerate
  "r_shadow_lightpos_lerptime": (val) => true, //
  "r_shadow_shortenfactor": (val) => true, // makes shadows cast from local lights shorter
  "r_shadowangles": (val) => true, // cmd set shadow angles
  "r_shadowblobbycutoff": (val) => true, // cmd some shadow stuff
  "r_shadowcolor": (val) => true, // cmd set shadow color
  "r_shadowdir": (val) => true, // cmd set shadow direction
  "r_shadowdist": (val) => true, // cmd set shadow distance
  "r_shadowfromanyworldlight": (val) => true, //
  "r_shadowfromworldlights": (val) => true, // enable shadowing from world lights
  "r_shadowfromworldlights_debug": (val) => true, //
  "r_shadowids": (val) => true, //
  "r_shadowlod": (val) => true, //
  "r_shadowmaxrendered": (val) => true, //
  "r_shadowrendertotexture": (val) => true, //
  "r_shadows": (val) => true, //
  "r_shadows_gamecontrol": (val) => true, //
  "r_shadows_on_renderables_enable": (val) => true, // support casting rtt shadows onto other renderables
  "r_shadowwireframe": (val) => true, //
  "r_showenvcubemap": (val) => true, //
  "r_showviewerarea": (val) => true, //
  "r_showz_power": (val) => val == 1, //
  "r_simpleworldmodel_drawbeyonddistance_fullscreen": (val) => true, //
  "r_simpleworldmodel_drawbeyonddistance_pip": (val) => true, //
  "r_simpleworldmodel_drawbeyonddistance_splitscreen": (val) => true, //
  "r_simpleworldmodel_drawforrecursionlevel_fullscreen": (val) => true, //
  "r_simpleworldmodel_drawforrecursionlevel_pip": (val) => true, //
  "r_simpleworldmodel_drawforrecursionlevel_splitscreen": (val) => true, //
  "r_simpleworldmodel_waterreflections_fullscreen": (val) => true, //
  "r_simpleworldmodel_waterreflections_pip": (val) => true, //
  "r_simpleworldmodel_waterreflections_splitscreen": (val) => true, //
  "r_skin": (val) => true, //
  "r_skybox": (val) => true, // enable the rendering of sky boxes
  "r_skybox_draw_last": (val) => true, // draws skybox after world brush geometry, rather than before.
  "r_slowpathwireframe": (val) => true, //
  "r_snapportal": (val) => true, //
  "r_snowcolorblue": (val) => true, // snow.
  "r_snowcolorgreen": (val) => true, // snow.
  "r_snowcolorred": (val) => true, // snow.
  "r_snowdebugbox": (val) => true, // snow debug boxes.
  "r_snowenable": (val) => true, // snow enable
  "r_snowendalpha": (val) => true, // snow.
  "r_snowendsize": (val) => true, // snow.
  "r_snowfallspeed": (val) => true, // snow fall speed scale.
  "r_snowinsideradius": (val) => true, // snow.
  "r_snowoutsideradius": (val) => true, // snow.
  "r_snowparticles": (val) => true, // snow.
  "r_snowposscale": (val) => true, // snow.
  "r_snowrayenable": (val) => true, // snow.
  "r_snowraylength": (val) => true, // snow.
  "r_snowrayradius": (val) => true, // snow.
  "r_snowspeedscale": (val) => true, // snow.
  "r_snowstartalpha": (val) => true, // snow.
  "r_snowstartsize": (val) => true, // snow.
  "r_snowwindscale": (val) => true, // snow.
  "r_snowzoomoffset": (val) => true, // snow.
  "r_snowzoomradius": (val) => true, // snow.
  "r_spray_lifetime": (val) => true, // number of rounds player sprays are visible
  "r_sse_s": (val) => true, // sse ins for particle sphere create
  "r_staticlight_streams": (val) => true, //
  "r_staticprop_lod": (val) => true, //
  "r_staticpropinfo": (val) => true, //
  "r_swingflashlight": (val) => true, //
  "r_teeth": (val) => true, //
  "r_threaded_blobulator": (val) => true, // if enabled, blobulator will use material thread.
  "r_threaded_particles": (val) => true, //
  "r_threaded_shadow_clip": (val) => true, //
  "r_threadeddetailprops": (val) => true, // enable threading of detail prop drawing
  "r_unlimitedrefract": (val) => true, //
  "r_unloadlightmaps": (val) => true, //
  "r_updaterefracttexture": (val) => true, //
  "r_vehiclebrakerate": (val) => true, //
  "r_vehicleviewclamp": (val) => true, //
  "r_vehicleviewdampen": (val) => true, //
  "r_visambient": (val) => val == 0, // draw leaf ambient lighting samples.  needs mat_leafvis 1 to work
  "r_visocclusion": (val) => val == 0, // activate/deactivate wireframe rendering of what the occlusion system is doing.
  "r_visualizelighttraces": (val) => val == 0, //
  "r_visualizelighttracesshowfulltrace": (val) => val == 0, //
  "r_visualizeproplightcaching": (val) => val == 0, //
  "r_visualizetraces": (val) => val == 0, //
  "r_waterdrawreflection": (val) => true, // enable water reflection
  "r_waterdrawrefraction": (val) => true, // enable water refraction
  "r_waterforceexpensive": (val) => true, //
  "r_waterforcereflectentities": (val) => true, //
  "r_worldlightmin": (val) => true, //
  "r_worldlights": (val) => true, // number of world lights to use per vertex
  "r_worldlistcache": (val) => true, //
  "ragdoll_sleepaftertime": (val) => true, // after this many seconds of being basically stationary, the ragdoll will go to sleep.
  "rate": (val) => val >= 20000 && val <= 30000, // max bytes/sec the host can receive data
  "rcon": (val) => cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")), // cmd issue an rcon command.
  "rcon_address": (val) => true, // address of remote server if sending unconnected rcon commands (format x.x.x.x:p)
  "rcon_password": (val) => true, // remote console password.
  "recompute_speed": (val) => false, // cmd recomputes clock speed (for debugging purposes).
  "record": (val) => true, // cmd record a demo.
  "record_research_data": (val) => true, // in challenge and editor maps, output research data to portal2_research_data.csv if enabled
  "reload": (val) => false, // cmd reload the most recent saved game (add setpos to jump to current view position on reload).
  "+reload": (val) => true, // cmd
  "-reload": (val) => true, // cmd
  "reload_materials": (val) => val == 0, //
  "reload_vjobs": (val) => false, // cmd reload vjobs module
  "remote_bug": (val) => false, // cmd starts a bug report with data from the currently connected rcon machine
  "+remote_view": (val) => true, // cmd
  "-remote_view": (val) => true, // cmd
  "removeallpaint": (val) => false, // cmd
  "removeid": (val) => true, // cmd remove a user id from the ban list.
  "removeip": (val) => true, // cmd remove an ip address from the ban list.
  "render_blanks": (val) => false, // cmd render n blank frames
  "report_cliententitysim": (val) => val == 0, // list all clientside simulations and time - will report and turn itself off.
  "report_clientthinklist": (val) => val == 0, // list all clientside entities thinking and time - will report and turn itself off.
  "report_entities": (val) => false, // cmd lists all entities
  "report_simthinklist": (val) => false, // cmd lists all simulating/thinking entities
  "report_soundpatch": (val) => false, // cmd reports sound patch count
  "report_touchlinks": (val) => false, // cmd lists all touchlinks
  "res_restrict_access": (val) => true, //
  "reset_gameconvars": (val) => false, // cmd reset a bunch of game convars to default values
  "respawn_entities": (val) => false, // cmd respawn all the entities in the map.
  "restart": (val) => true, // cmd restart the game on the same level (add setpos to jump to current view position on restart).
  "restart_level": (val) => true,
  "+right": (val) => true, // cmd
  "-right": (val) => true, // cmd
  "room_type": (val) => true, //
  "rope_averagelight": (val) => true, // makes ropes use average of cubemap lighting instead of max intensity.
  "rope_collide": (val) => val == 1, // collide rope with the world
  "rope_min_pixel_diameter": (val) => val == 2, //
  "rope_rendersolid": (val) => val == 1, //
  "rope_shake": (val) => val == 0, //
  "rope_smooth": (val) => val == 1, // do an antialiasing effect on ropes
  "rope_smooth_enlarge": (val) => val == 1, // how much to enlarge ropes in screen space for antialiasing effect
  "rope_smooth_maxalpha": (val) => true, // alpha for rope antialiasing effect
  "rope_smooth_maxalphawidth": (val) => true, //
  "rope_smooth_minalpha": (val) => true, // alpha for rope antialiasing effect
  "rope_smooth_minwidth": (val) => true, // when using smoothing, this is the min screenspace width it lets a rope shrink to
  "rope_solid_maxalpha": (val) => true, //
  "rope_solid_maxwidth": (val) => true, //
  "rope_solid_minalpha": (val) => true, //
  "rope_solid_minwidth": (val) => true, //
  "rope_subdiv": (val) => val == 2, // rope subdivision amount
  "rope_wind_dist": (val) => val == 1000, // don't use cpu applying small wind gusts to ropes when they're past this distance.
  "rr_debug_qa": (val) => val == 0, // set to 1 to see debug related to the question & answer system used to create conversations between allied npcs.
  "rr_debugresponseconcept": (val) => val == 0, // if set, rr_debugresponses will print only responses testing for the specified concept
  "rr_debugresponseconcept_exclude": (val) => false, // cmd set a list of concepts to exclude from rr_debugresponseconcept. separate multiple concepts with spaces. call with no arguments
  "rr_debugresponses": (val) => val == 0, // show verbose matching output (1 for simple, 2 for rule scoring, 3 for noisy). if set to 4, it will only show response success/f
  "rr_debugrule": (val) => val == 0, // if set to the name of the rule, that rule's score will be shown whenever a concept is passed into the response rules system.
  "rr_dumpresponses": (val) => val == 0, // dump all response_rules.txt and rules (requires restart)
  "rr_followup_maxdist": (val) => val == 1800, // 'then any' or 'then all' response followups will be dispatched only to characters within this distance.
  "rr_forceconcept": (val) => false, // cmd fire a response concept directly at a given character. usage: rr_forceconcept <target> <concept> 'criteria1:value1,criteria2:va
  "rr_reloadresponsesystems": (val) => false, // cmd reload all response system scripts.
  "rr_remarkable_max_distance": (val) => val == 1200, // ais will not even consider remarkarbles that are more than this many units away.
  "rr_remarkable_world_entities_replay_limit": (val) => val == 1, // tlk_remarks will be dispatched no more than this many times for any given info_remarkable
  "rr_remarkables_enabled": (val) => val == 1, // if 1, polling for info_remarkables and issuances of tlk_remark is enabled.
  "rr_thenany_score_slop": (val) => val == 0, // when computing respondents for a 'then any' rule, all rule-matching scores within this much of the best score will be considere
  "save": (val) => false, // cmd saves current game.
  "save_async": (val) => val == 1, //
  "save_asyncdelay": (val) => val == 0, // for testing, adds this many milliseconds of delay to the save operation.
  "save_console": (val) => val == 0, // autosave on the pc behaves like it does on the consoles.
  "save_disable": (val) => true, //
  "save_finish_async": (val) => false, // cmd
  "save_history_count": (val) => true, // keep this many old copies in history of autosaves and quicksaves.
  "save_huddelayframes": (val) => true, // number of frames to defer for drawing the saving message.
  "save_in_memory": (val) => true, // set to 1 to save to memory instead of disk (xbox 360)
  "save_noxsave": (val) => val == 0, //
  "save_screenshot": (val) => true, // 0 = none, 1 = non-autosave, 2 = always
  "save_spew": (val) => val == 0, //
  "say": (val) => true, // cmd display player message
  "say_team": (val) => true, // cmd display player message to team
  "scene_async_prefetch_spew": (val) => val == 0, // display async .ani file loading info.
  "scene_clamplookat": (val) => val == 1, // clamp head turns to a max of 20 degrees per think.
  "scene_clientflex": (val) => val == 1, // do client side flex animation.
  "scene_clientplayback": (val) => val == 1, // play all vcds on the clients.
  "scene_flatturn": (val) => val == 1, //
  "scene_flush": (val) => false, // cmd flush all .vcds from the cache and reload from disk.
  "scene_forcecombined": (val) => val == 0, // when playing back, force use of combined .wav files even in english.
  "scene_maxcaptionradius": (val) => val == 1200, // only show closed captions if recipient is within this many units of speaking actor (0==disabled).
  "scene_playvcd": (val) => false, // cmd play the given vcd as an instanced scripted scene.
  "scene_print": (val) => val == 0, // when playing back a scene, print timing and event info to console.
  "scene_showfaceto": (val) => val == 0, // when playing back, show the directions of faceto events.
  "scene_showlook": (val) => val == 0, // when playing back, show the directions of look events.
  "scene_showmoveto": (val) => val == 0, // when moving, show the end location.
  "scene_showunlock": (val) => val == 0, // show when a vcd is playing but normal ai is running.
  "scene_vcdautosave": (val) => val == 0, // create a savegame before vcd playback
  "+score": (val) => true, // cmd
  "-score": (val) => true, // cmd
  "scr_centertime": (val) => true, //
  "screenshot": (val) => true, // cmd take a screenshot.
  "script": (val) => (val === "::coopUpdatePortals()"), // cmd run the text as a script
  "script_client": (val) => false, // cmd run the text as a script
  "script_connect_debugger_on_mapspawn": (val) => val == 0, //
  "script_debug": (val) => false, // cmd connect the vscript vm to the script debugger
  "script_debug_client": (val) => false, // cmd connect the vscript vm to the script debugger
  "script_dump_all": (val) => false, // cmd dump the state of the vm to the console
  "script_dump_all_client": (val) => false, // cmd dump the state of the vm to the console
  "script_execute": (val) => false, // cmd run a vscript file
  "script_execute_client": (val) => false, // cmd run a vscript file
  "script_help": (val) => false, // cmd output help for script functions, optionally with a search string
  "script_help_client": (val) => false, // cmd output help for script functions, optionally with a search string
  "script_reload_code": (val) => false, // cmd execute a vscript file, replacing existing functions with the functions in the run script
  "script_reload_entity_code": (val) => false, // cmd execute all of this entity's vscripts, replacing existing functions with the functions in the run scripts
  "script_reload_think": (val) => false, // cmd execute an activation script, replacing existing functions with the functions in the run script
  "sensitivity": (val) => true, // mouse sensitivity.
  "server_game_time": (val) => false, // cmd gives the game time in seconds (server's curtime)
  "servercfgfile": (val) => false, //
  "setang": (val) => false, // cmd snap player eyes to specified pitch yaw <roll:optional> (must have sv_cheats).
  "setang_exact": (val) => false, // cmd snap player eyes and orientation to specified pitch yaw <roll:optional> (must have sv_cheats).
  "setinfo": (val) => false, // cmd adds a new user info value
  "setmodel": (val) => false, // cmd changes's player's model
  "setpause": (val) => true, // cmd set the pause state of the server.
  "setpos": (val) => false, // cmd move player to specified origin (must have sv_cheats).
  "setpos_exact": (val) => false, // cmd move player to an exact specified origin (must have sv_cheats).
  "setpos_player": (val) => false, // cmd move specified player to specified origin (must have sv_cheats).
  "sfm_record_hz": (val) => true, //
  "shake": (val) => false, // cmd shake the screen.
  "shake_show": (val) => val == 0, // displays a list of the active screen shakes.
  "shake_stop": (val) => false, // cmd stops all active screen shakes.
  "shake_testpunch": (val) => false, // cmd test a punch-style screen shake.
  "+showbudget": (val) => true, // cmd
  "-showbudget": (val) => true, // cmd
  "showbudget_texture": (val) => true, // enable the texture budget panel.
  "+showbudget_texture": (val) => true, // cmd
  "-showbudget_texture": (val) => true, // cmd
  "+showbudget_texture_global": (val) => true, // cmd
  "-showbudget_texture_global": (val) => true, // cmd
  "showbudget_texture_global_dumpstats": (val) => true, // cmd dump all items in +showbudget_texture_global in a text form
  "showbudget_texture_global_sum": (val) => true, //
  "showconsole": (val) => true, // cmd show the console.
  "showgamesettings": (val) => true, // cmd
  "showhitlocation": (val) => val == 0, //
  "showinfo": (val) => false, // cmd shows a info panel: <type> <title> <message> [<command>]
  "showpanel": (val) => false, // cmd shows a viewport panel <name>
  "showparticlecounts": (val) => true, // display number of particles drawn per frame
  "+showportals": (val) => true, // cmd
  "-showportals": (val) => true, // cmd
  "+showscores": (val) => true, // cmd
  "-showscores": (val) => true, // cmd
  "showtriggers": (val) => val == 0, // shows trigger brushes
  "showtriggers_toggle": (val) => false, // cmd toggle show triggers
  "+showvprof": (val) => false, // cmd
  "-showvprof": (val) => false, // cmd
  "singlestep": (val) => val == 0, // run engine in single step mode ( set next to 1 to advance a frame )
  "sk_allow_autoaim": (val) => val == 1, //
  "sk_ally_regen_time": (val) => val == 0, // time taken for an ally to regenerate a point of health.
  "sk_ammo_qty_scale1": (val) => val == 1, //
  "sk_ammo_qty_scale2": (val) => val == 1, //
  "sk_ammo_qty_scale3": (val) => val == 0, //
  "sk_auto_reload_time": (val) => val == 3, //
  "sk_autoaim_mode": (val) => true, //
  "sk_autoaim_scale1": (val) => val == 1, //
  "sk_autoaim_scale2": (val) => val == 1, //
  "sk_bullseye_health": (val) => val == 0, //
  "sk_combine_ball_search_radius": (val) => val == 512, //
  "sk_combineball_guidefactor": (val) => val == 0, //
  "sk_combineball_seek_angle": (val) => val == 15, //
  "sk_combineball_seek_kill": (val) => val == 0, //
  "sk_dmg_inflict_scale1": (val) => val == 1, //
  "sk_dmg_inflict_scale2": (val) => val == 1, //
  "sk_dmg_inflict_scale3": (val) => val == 0, //
  "sk_dmg_sniper_penetrate_npc": (val) => val == 0, //
  "sk_dmg_sniper_penetrate_plr": (val) => val == 0, //
  "sk_dmg_take_scale1": (val) => val == 0, //
  "sk_dmg_take_scale2": (val) => val == 1, //
  "sk_dmg_take_scale3": (val) => val == 1, //
  "sk_fraggrenade_radius": (val) => val == 0, //
  "sk_hover_turret_health": (val) => val == 150, //
  "sk_max_357": (val) => val == 0, //
  "sk_max_alyxgun": (val) => val == 0, //
  "sk_max_ar2": (val) => val == 0, //
  "sk_max_ar2_altfire": (val) => val == 0, //
  "sk_max_buckshot": (val) => val == 0, //
  "sk_max_crossbow": (val) => val == 0, //
  "sk_max_gauss_round": (val) => val == 0, //
  "sk_max_grenade": (val) => val == 0, //
  "sk_max_pistol": (val) => val == 0, //
  "sk_max_rpg_round": (val) => val == 0, //
  "sk_max_smg1": (val) => val == 0, //
  "sk_max_smg1_grenade": (val) => val == 0, //
  "sk_max_sniper_round": (val) => val == 0, //
  "sk_npc_arm": (val) => val == 1, //
  "sk_npc_chest": (val) => val == 1, //
  "sk_npc_dmg_357": (val) => val == 0, //
  "sk_npc_dmg_airboat": (val) => val == 0, //
  "sk_npc_dmg_alyxgun": (val) => val == 0, //
  "sk_npc_dmg_ar2": (val) => val == 0, //
  "sk_npc_dmg_buckshot": (val) => val == 0, //
  "sk_npc_dmg_combineball": (val) => val == 15, //
  "sk_npc_dmg_crossbow": (val) => val == 0, //
  "sk_npc_dmg_fraggrenade": (val) => val == 0, //
  "sk_npc_dmg_grenade": (val) => val == 0, //
  "sk_npc_dmg_gunship": (val) => val == 0, //
  "sk_npc_dmg_gunship_to_plr": (val) => val == 0, //
  "sk_npc_dmg_pistol": (val) => val == 0, //
  "sk_npc_dmg_rpg_round": (val) => val == 0, //
  "sk_npc_dmg_smg1": (val) => val == 0, //
  "sk_npc_dmg_smg1_grenade": (val) => val == 0, //
  "sk_npc_dmg_sniper_round": (val) => val == 0, //
  "sk_npc_head": (val) => val == 2, //
  "sk_npc_leg": (val) => val == 1, //
  "sk_npc_stomach": (val) => val == 1, //
  "sk_player_arm": (val) => val == 1, //
  "sk_player_chest": (val) => val == 1, //
  "sk_player_head": (val) => val == 2, //
  "sk_player_leg": (val) => val == 1, //
  "sk_player_stomach": (val) => val == 1, //
  "sk_plr_dmg_357": (val) => val == 0, //
  "sk_plr_dmg_airboat": (val) => val == 0, //
  "sk_plr_dmg_alyxgun": (val) => val == 0, //
  "sk_plr_dmg_ar2": (val) => val == 0, //
  "sk_plr_dmg_buckshot": (val) => val == 0, //
  "sk_plr_dmg_crossbow": (val) => val == 0, //
  "sk_plr_dmg_fraggrenade": (val) => val == 0, //
  "sk_plr_dmg_grenade": (val) => val == 0, //
  "sk_plr_dmg_pistol": (val) => val == 0, //
  "sk_plr_dmg_rpg_round": (val) => val == 0, //
  "sk_plr_dmg_smg1": (val) => val == 0, //
  "sk_plr_dmg_smg1_grenade": (val) => val == 0, //
  "sk_plr_dmg_sniper_round": (val) => val == 0, //
  "sk_plr_grenade_drop_time": (val) => val == 30, //
  "sk_plr_health_drop_time": (val) => val == 30, //
  "sk_plr_num_shotgun_pellets": (val) => val == 7, //
  "sk_suitcharger": (val) => true, //
  "sk_suitcharger_citadel": (val) => true, //
  "sk_suitcharger_citadel_maxarmor": (val) => true, //
  "skill": (val) => true, // game skill level (1-3).
  "skybox_swap": (val) => true, // cmd swap through the skyboxes in our queue
  "sleep_when_meeting_framerate": (val) => val == 1, // sleep instead of spinning if we're meeting the desired framerate.
  "sleep_when_meeting_framerate_headroom_ms": (val) => val == 2, // only sleep if the current frame has at least this much time remaining, otherwise spin.
  "slot0": (val) => true, // cmd
  "slot1": (val) => true, // cmd
  "slot10": (val) => true, // cmd
  "slot2": (val) => true, // cmd
  "slot3": (val) => true, // cmd
  "slot4": (val) => true, // cmd
  "slot5": (val) => true, // cmd
  "slot6": (val) => true, // cmd
  "slot7": (val) => true, // cmd
  "slot8": (val) => true, // cmd
  "slot9": (val) => true, // cmd
  "smoothstairs": (val) => val == 1, // smooth player eye z coordinate when traversing stairs.
  "snapto": (val) => false, // cmd
  "snd_async_flush": (val) => true, // cmd flush all unlocked async audio data
  "snd_async_fullyasync": (val) => true, // all playback is fully async (sound doesn't play until data arrives).
  "snd_async_minsize": (val) => true, //
  "snd_async_showmem": (val) => true, // cmd show async memory stats
  "snd_async_showmem_music": (val) => true, // cmd show async memory stats for just non-streamed music
  "snd_async_showmem_summary": (val) => true, // cmd show brief async memory stats
  "snd_async_spew_blocking": (val) => true, // spew message to console any time async sound loading blocks on file i/o.
  "snd_async_stream_fail": (val) => true, // spew stream pool failures.
  "snd_async_stream_purges": (val) => true, // spew stream pool purges.
  "snd_async_stream_recover_from_exhausted_stream": (val) => true, // if 1, recovers when the stream is exhausted when playing pcm sounds (prevents music or ambiance sounds to stop if too many soun
  "snd_async_stream_spew": (val) => true, // spew streaming info ( 0=off, 1=streams, 2=buffers
  "snd_async_stream_spew_delayed_start_filter": (val) => true, // filter used to spew sounds that starts late. use an empty string '' to display all sounds. by default only the vo are displayed
  "snd_async_stream_spew_delayed_start_time": (val) => true, // spew any asynchronous sound that starts with more than n milliseconds delay. by default spew when there is more than 500 ms del
  "snd_async_stream_spew_exhausted_buffer": (val) => true, // if 1, spews warnings when the buffer is exhausted (recommended). set to 0 for no spew (for debugging purpose only).
  "snd_async_stream_spew_exhausted_buffer_time": (val) => true, // number of milliseconds between each exhausted buffer spew.
  "snd_async_stream_static_alloc": (val) => true, // if 1, spews allocations on the static alloc pool. set to 0 for no spew.
  "snd_cull_duplicates": (val) => true, // if nonzero, aggressively cull duplicate sounds during mixing. the number specifies the number of duplicates allowed to be playe
  "snd_debug_gaincurve": (val) => true, // visualize sound gain fall off
  "snd_debug_gaincurvevol": (val) => true, // visualize sound gain fall off
  "snd_defer_trace": (val) => true, //
  "snd_delay_for_choreo_enabled": (val) => true, // enables update of delay for choreo to compensate for io latency.
  "snd_delay_for_choreo_reset_after_n_milliseconds": (val) => true, // resets the choreo latency after n milliseconds of vo not playing. default is 500 ms.
  "snd_delay_sound_shift": (val) => true, //
  "snd_disable_mixer_duck": (val) => true, //
  "snd_disable_mixer_solo": (val) => true, //
  "snd_dsp_cancel_old_preset_after_n_milliseconds": (val) => true, // number of milliseconds after an unused previous preset is not considered valid for the start of a cross-fade.
  "snd_dsp_optimization": (val) => true, // turns optimization on for dsp effects if set to 1 (default). 0 to turn the optimization off.
  "snd_dsp_spew_changes": (val) => true, // spews major changes to the dsp or presets if set to 1. 0 to turn the spew off (default).
  "snd_duckerattacktime": (val) => true, //
  "snd_duckerreleasetime": (val) => true, //
  "snd_duckerthreshold": (val) => true, //
  "snd_ducking_off": (val) => true, //
  "snd_ducktovolume": (val) => true, //
  "snd_dump_filepaths": (val) => true, // cmd
  "snd_dumpclientsounds": (val) => true, // cmd dump sounds to console
  "snd_dvar_dist_max": (val) => true, // play full 'far' sound at this distance
  "snd_dvar_dist_min": (val) => true, // play full 'near' sound at this distance
  "snd_filter": (val) => true, //
  "snd_find_channel": (val) => true, // scan every channel to find the corresponding sound.
  "snd_foliage_db_loss": (val) => true, // foliage db loss per 1200 units
  "snd_gain": (val) => true, //
  "snd_gain_max": (val) => true, //
  "snd_gain_min": (val) => true, //
  "snd_getmixer": (val) => true, // cmd get data related to mix group matching string
  "snd_legacy_surround": (val) => true, //
  "snd_list": (val) => true, //
  "snd_lockpartial": (val) => true, //
  "snd_max_same_sounds": (val) => true, //
  "snd_max_same_weapon_sounds": (val) => true, //
  "snd_mergemethod": (val) => true, // sound merge method (0 == sum and clip, 1 == max, 2 == avg).
  "snd_mix_async": (val) => true, //
  "snd_mix_optimization": (val) => true, // turns optimization on for mixing if set to 1 (default). 0 to turn the optimization off.
  "snd_mix_soundchar_enabled": (val) => true, // turns sound char on for mixing if set to 1 (default). 0 to turn the sound char off and use default behavior (spatial instead of
  "snd_mixahead": (val) => true, //
  "snd_mixer_master_dsp": (val) => true, //
  "snd_mixer_master_level": (val) => true, //
  "snd_moviefix": (val) => true, // defer sound recording until next tick when laying off movies.
  "snd_musicvolume": (val) => true, // music volume
  "snd_mute_losefocus": (val) => true, //
  "snd_noextraupdate": (val) => true, //
  "snd_obscured_gain_db": (val) => true, //
  "snd_op_test_convar": (val) => true, //
  "snd_pause_all": (val) => true, // specifies to pause all sounds and not just voice
  "snd_pitchquality": (val) => true, //
  "snd_playsounds": (val) => true, // cmd play sounds from the game sounds txt file at a given location
  "snd_pre_gain_dist_falloff": (val) => true, //
  "snd_prefetch_common": (val) => true, // prefetch common sounds from directories specified in scripts/sound_prefetch.txt
  "snd_print_channel_by_guid": (val) => true, // cmd prints the content of a channel from its guid. snd_print_channel_by_guid <guid>.
  "snd_print_channel_by_index": (val) => true, // cmd prints the content of a channel from its index. snd_print_channel_by_index <index>.
  "snd_print_channels": (val) => true, // cmd prints all the active channel.
  "snd_print_dsp_effect": (val) => true, // cmd prints the content of a dsp effect.
  "snd_profile": (val) => true, //
  "snd_rebuildaudiocache": (val) => true, // cmd rebuild audio cache for current language
  "snd_refdb": (val) => true, // reference db at snd_refdist
  "snd_refdist": (val) => true, // reference distance for snd_refdb
  "snd_report_format_sound": (val) => true, // if set to 1, report all sound formats.
  "snd_report_loop_sound": (val) => true, // if set to 1, report all sounds that just looped.
  "snd_report_start_sound": (val) => true, // if set to 1, report all sounds played with s_startsound(). the sound may not end up being played (if error occurred for example
  "snd_report_stop_sound": (val) => true, // if set to 1, report all sounds stopped with s_stopsound().
  "snd_report_verbose_error": (val) => true, // if set to 1, report more error found when playing sounds.
  "snd_restart": (val) => true, // cmd restart sound system.
  "snd_set_master_volume": (val) => true, // cmd sets the master volume for a channel. snd_set_master_volume <guid> <mastervolume>.
  "snd_setmixer": (val) => true, // cmd set named mixgroup of current mixer to mix vol, mute, solo.
  "snd_setmixlayer": (val) => true, // cmd set named mixgroup of named mix layer to mix vol, mute, solo.
  "snd_setmixlayer_amount": (val) => true, // cmd set named mix layer mix amount.
  "snd_setsoundparam": (val) => true, // cmd set a sound paramater
  "snd_show": (val) => true, // show sounds info
  "snd_show_channel_count": (val) => true, // show the current count of channel types.
  "snd_showclassname": (val) => true, //
  "snd_showmixer": (val) => true, //
  "snd_showstart": (val) => true, //
  "snd_showthreadframetime": (val) => true, //
  "snd_sos_allow_dynamic_chantype": (val) => true, //
  "snd_sos_exec_when_paused": (val) => true, //
  "snd_sos_flush_operators": (val) => true, // cmd flush and re-parse the sound operator system
  "snd_sos_get_opvar": (val) => true, // cmd
  "snd_sos_list_operator_updates": (val) => true, //
  "snd_sos_print_operators": (val) => true, // cmd prints a list of currently available operators
  "snd_sos_set_opvar": (val) => true, // cmd
  "snd_sos_show_block_debug": (val) => true, // spew data about the list of block entries.
  "snd_sos_show_client_rcv": (val) => true, //
  "snd_sos_show_client_xmit": (val) => true, //
  "snd_sos_show_entry_match_free": (val) => true, //
  "snd_sos_show_operator_entry_filter": (val) => true, //
  "snd_sos_show_operator_init": (val) => true, //
  "snd_sos_show_operator_prestart": (val) => true, //
  "snd_sos_show_operator_shutdown": (val) => true, //
  "snd_sos_show_operator_start": (val) => true, //
  "snd_sos_show_operator_stop_entry": (val) => true, //
  "snd_sos_show_operator_updates": (val) => true, //
  "snd_sos_show_opvar_list": (val) => true, //
  "snd_sos_show_queuetotrack": (val) => true, //
  "snd_sos_show_server_xmit": (val) => true, //
  "snd_sos_show_source_info": (val) => true, //
  "snd_sos_show_startqueue": (val) => true, //
  "snd_sos_show_track_list": (val) => true, //
  "snd_soundmixer": (val) => true, //
  "snd_soundmixer_flush": (val) => true, // cmd reload soundmixers.txt file.
  "snd_soundmixer_list_mix_groups": (val) => true, // cmd list all mix groups to dev console.
  "snd_soundmixer_list_mix_layers": (val) => true, // cmd list all mix layers to dev console.
  "snd_soundmixer_list_mixers": (val) => true, // cmd list all mixers to dev console.
  "snd_soundmixer_parse_debug": (val) => true, //
  "snd_soundmixer_set_trigger_factor": (val) => true, // cmd set named mix layer / mix group, trigger amount.
  "snd_soundmixer_version": (val) => true, //
  "snd_spatialize_roundrobin": (val) => true, // lowend optimization: if nonzero, spatialize only a fraction of sound channels each frame. 1/2^x of channels will be spatialized
  "snd_spew_dsp_process": (val) => true, // spews text every time a dsp effect is applied if set to 1. 0 to turn the spew off (default).
  "snd_store_filepaths": (val) => true, //
  "snd_surround_speakers": (val) => true, //
  "snd_updateaudiocache": (val) => true, // cmd checks _master.cache based on file sizes and rebuilds any change/new entries
  "snd_visualize": (val) => true, // show sounds location in world
  "snd_vol_no_xfade": (val) => true, // if current and target volumes are close, don't cross-fade.
  "snd_vol_xfade_incr_max": (val) => true, // never change volume by more than +/-n units per frame during cross-fade.
  "snd_vol_xfade_speed_multiplier_for_doppler": (val) => true, // doppler effect is extremely sensible to volume variation. to reduce the pops, the cross-fade has to be very slow.
  "snd_vol_xfade_time": (val) => true, // channel volume cross-fade time in seconds.
  "snd_vox_captiontrace": (val) => true, // shows sentence name for sentences which are set not to show captions.
  "snd_vox_globaltimeout": (val) => true, //
  "snd_vox_sectimetout": (val) => true, //
  "snd_vox_seqtimetout": (val) => true, //
  "snd_writemanifest": (val) => true, // cmd if running a game, outputs the precache manifest for the current level
  "sndplaydelay": (val) => false, // cmd
  "soundfade": (val) => true, // cmd fade client volume.
  "soundinfo": (val) => true, // cmd describe the current sound device.
  "soundlist": (val) => true, // cmd list all known sounds.
  "soundpatch_captionlength": (val) => true, // how long looping soundpatch captions should display for.
  "soundscape_debug": (val) => val == 0, // when on, draws lines to all env_soundscape entities. green lines show the active soundscape, red lines show soundscapes that ar
  "soundscape_dumpclient": (val) => false, // cmd dumps the client's soundscape data.
  "soundscape_fadetime": (val) => true, // time to crossfade sound effects between soundscapes
  "soundscape_flush": (val) => true, // cmd flushes the server & client side soundscapes
  "soundscape_message": (val) => true, //
  "soundscape_radius_debug": (val) => val == 0, // prints current volume of radius sounds
  "sp_fade_and_force_respawn": (val) => val == 1, //
  "speak": (val) => false, // cmd play a constructed sentence.
  "spec_autodirector": (val) => true, // auto-director chooses best view modes while spectating
  "spec_freeze_distance_max": (val) => true, // maximum random distance from the target to stop when framing them in observer freeze cam.
  "spec_freeze_distance_min": (val) => true, // minimum random distance from the target to stop when framing them in observer freeze cam.
  "spec_freeze_time": (val) => true, // time spend frozen in observer freeze cam.
  "spec_freeze_traveltime": (val) => true, // time taken to zoom in to frame a target in observer freeze cam.
  "spec_mode": (val) => false, // cmd set spectator mode
  "spec_next": (val) => false, // cmd spectate next player
  "spec_player": (val) => false, // cmd spectate player by name
  "spec_pos": (val) => false, // cmd dump position and angles to the console
  "spec_prev": (val) => false, // cmd spectate previous player
  "spec_scoreboard": (val) => true, //
  "spec_track": (val) => true, // tracks an entity in spec mode
  "+speed": (val) => false, // cmd
  "-speed": (val) => false, // cmd
  "speed_funnelling_enabled": (val) => val == 1, // toggle whether the player is funneled into portals while running on speed paint.
  "speed_paint_color": (val) => val == -16749825, // color for speed paint
  "spike": (val) => false, // cmd generates a fake spike
  "ss_enable": (val) => true, // enables split screen support. play single player now launches into split screen mode. no online support
  "ss_force_primary_fullscreen": (val) => true, // if enabled, all splitscreen users will only see the first user's screen full screen
  "ss_map": (val) => false, // cmd start playing on specified map with max allowed splitscreen players.
  "ss_pip_bottom_offset": (val) => true, // pip offset vector from the bottom of the screen
  "ss_pip_right_offset": (val) => true, // pip offset vector from the right of the screen
  "ss_pipscale": (val) => true, // scale of the pip aspect ratio to our resolution.
  "ss_pipsplit": (val) => true, // if enabled, use pip instead of splitscreen. (only works for 2 players)
  "ss_reloadletterbox": (val) => true, // cmd ss_reloadletterbox
  "ss_splitmode": (val) => true, // two player split screen mode (0 - recommended settings base on the width, 1 - horizontal, 2 - vertical (only allowed in widescr
  "ss_verticalsplit": (val) => true, // two player split screen uses vertical split (do not set this directly, use ss_splitmode instead).
  "ss_voice_hearpartner": (val) => true, // route voice between splitscreen players on same system.
  "star_memory": (val) => true, // cmd dump memory stats
  "startdemos": (val) => false, // cmd play demos in demo sequence.
  "startmovie": (val) => false, // cmd start recording movie frames.
  "startneurotoxins": (val) => false, // cmd starts the nerve gas timer.
  "startupmenu": (val) => false, // cmd opens initial menu screen and loads the background bsp, but only if no other level is being loaded, and we're not in developer
  "stats": (val) => false, // cmd prints server performance variables
  "status": (val) => false, // cmd display map and connection status.
  "step_spline": (val) => val == 0, //
  "stop": (val) => true, // cmd finish recording demo.
  "stop_transition_videos_fadeout": (val) => true, // cmd fades out all transition videos playing to the screen: <time>
  "stopdemo": (val) => false, // cmd stop playing back a demo.
  "stopsound": (val) => true, // cmd
  "stopsoundscape": (val) => true, // cmd stops all soundscape processing and fades current looping sounds
  "stopvideos": (val) => true, // cmd stops all videos playing to the screen
  "stopvideos_fadeout": (val) => true, // cmd fades out all videos playing to the screen: <time>
  "+strafe": (val) => true, // cmd
  "-strafe": (val) => true, // cmd
  "stringtable_alwaysrebuilddictionaries": (val) => true, // rebuild dictionary file on every level load
  "stringtable_compress": (val) => true, // compress string table for networking
  "stringtable_showsizes": (val) => true, // show sizes of string tables when building for signon
  "stringtable_usedictionaries": (val) => true, // use dictionaries for string table networking
  "stringtabledictionary": (val) => true, // cmd create dictionary for current strings.
  "studio_queue_mode": (val) => true, //
  "stuffcmds": (val) => true, // cmd parses and stuffs command line + commands to command buffer.
  "suitvolume": (val) => true, //
  "surfaceprop": (val) => false, // cmd reports the surface properties at the cursor
  "sv_allchat": (val) => true, // players can receive all other players' text chat, no death restrictions
  "sv_allow_lobby_connect_only": (val) => true, // if set, players may only join this server from matchmaking lobby, may not connect directly.
  "sv_allow_mobile_portal_teleportation": (val) => val == 1, //
  "sv_allow_mobile_portals": (val) => val == 0, //
  "sv_allow_wait_command": (val) => true, // allow or disallow the wait command on clients connected to this server.
  "sv_allowdownload": (val) => true, // allow clients to download files
  "sv_allowupload": (val) => true, // allow clients to upload customizations files
  "sv_alltalk": (val) => true, // players can hear all other players, no team restrictions
  "sv_alternateticks": (val) => val == 1, // if set, server only simulates entities on even numbered ticks.
  "sv_autoladderdismount": (val) => true, // automatically dismount from ladders when you reach the end (don't have to +use).
  "sv_autosave": (val) => true, // set to 1 to autosave game on level transition. does not affect autosave triggers.
  "sv_benchmark_autovprofrecord": (val) => true, // if running a benchmark and this is set, it will record a vprof file over the duration of the benchmark with filename benchmark.
  "sv_benchmark_force_start": (val) => false, // cmd force start the benchmark. this is only for debugging. it's better to set sv_benchmark to 1 and restart the level.
  "sv_benchmark_numticks": (val) => true, // if > 0, then it only runs the benchmark for this # of ticks.
  "sv_bounce_anim_time_continue": (val) => val == 0, //
  "sv_bounce_anim_time_predict": (val) => val == 0, //
  "sv_bounce_reflect_enabled": (val) => val == 0, // enable/disable reflection on bounce.
  "sv_bowie_maneuver_threshold": (val) => val == 375, //
  "sv_box_physgundrop_angle_threshold": (val) => val == 70, //
  "sv_cacheencodedents": (val) => true, // if set to 1, does an optimization to prevent extra sendtable_encode calls.
  "sv_cheats": (val) => true, // allow cheats on server
  "sv_cheats_flagged": (val) => true, // allow cheats on server
  "sv_clearhinthistory": (val) => true, // cmd clear memory of server side hints displayed to the player.
  "sv_client_cmdrate_difference": (val) => val == 20, // cl_cmdrate is moved to within sv_client_cmdrate_difference units of cl_updaterate before it is clamped between sv_mincmdrate an
  "sv_client_max_interp_ratio": (val) => val == 5, // this can be used to limit the value of cl_interp_ratio for connected clients (only while they are connected). if sv_client_min_
  "sv_client_min_interp_ratio": (val) => val == 1, // this can be used to limit the value of cl_interp_ratio for connected clients (only while they are connected).               -1
  "sv_client_predict": (val) => val == -1, // this can be used to force the value of cl_predict for connected clients (only while they are connected).    -1 = let clients se
  "sv_clip_contacts_to_portals": (val) => val == 0, // enable/disable clipping contact regions to portal planes.
  "sv_clockcorrection_msecs": (val) => val == 60, // the server tries to keep each player's m_ntickbase withing this many msecs of the server absolute tickcount
  "sv_consistency": (val) => true, // whether the server enforces file consistency for critical files
  "sv_contact": (val) => val == 0, // contact email for server sysop
  "sv_contact_region_thickness": (val) => val == 0, // the thickness of a contact region (how much the box expands).
  "sv_debug_draw_contacts": (val) => val == 0, // 0: dont draw anything.  1: draw contacts.  2: draw colored contacts
  "sv_debug_dumpportalhole_nextcheck": (val) => val == 0, //
  "sv_debug_physicsshadowclones": (val) => val == 0, //
  "sv_debug_player_use": (val) => val == 0, // visualizes +use logic. green cross=trace success, red cross=trace too far, green box=radius success
  "sv_debug_portal_race_checkpoint": (val) => val == 0, //
  "sv_debugmanualmode": (val) => val == 0, // make sure entities correctly report whether or not their network data has changed.
  "sv_debugtempentities": (val) => val == 0, // show temp entity bandwidth usage.
  "sv_deltaprint": (val) => val == 0, // print accumulated calcdelta profiling data (only if sv_deltatime is on)
  "sv_deltatime": (val) => val == 0, // enable profiling of calcdelta calls
  "sv_downloadurl": (val) => val == 0, // location from which clients can download missing files
  "sv_dump_portalsimulator_collision": (val) => val == 0, //
  "sv_dump_portalsimulator_holeshapes": (val) => val == 0, //
  "sv_dumpstringtables": (val) => val == 0, //
  "sv_edgefriction": (val) => val == 2, //
  "sv_enable_paint_power_user_debug": (val) => val == 0, // enable debug spew for paint power users.
  "sv_enableholdrotation": (val) => val == 0, // when enabled, hold attack2 to rotate held objects
  "sv_enableoldqueries": (val) => true, // enable support for old style (hl1) server queries
  "sv_extra_client_connect_time": (val) => true, // seconds after client connect during which extra frames are buffered to prevent non-delta'd update
  "sv_filterban": (val) => val == 1, // set packet filtering by ip mode
  "sv_forcepreload": (val) => true, // force server side preloading.
  "sv_fullsyncclones": (val) => val == 1, //
  "sv_futbol_fake_force": (val) => val == 500, //
  "sv_futbol_floor_exit_angle": (val) => val == 85, //
  "sv_futbol_force_players_to_catch": (val) => val == 1, //
  "sv_futbol_use_cooldown_time": (val) => val == 0, //
  "sv_futbol_use_steals_from_holding_player": (val) => val == 1, //
  "sv_gameinstructor_disable": (val) => true, // force all clients to disable their game instructors.
  "sv_gravity": (val) => val == 600, // world gravity.
  "sv_hibernate_ms": (val) => val == 20, // # of milliseconds to sleep per frame while hibernating
  "sv_hibernate_ms_vgui": (val) => val == 20, // # of milliseconds to sleep per frame while hibernating but running the vgui dedicated server frontend
  "sv_hibernate_postgame_delay": (val) => val == 5, // # of seconds to wait after final client leaves before hibernating.
  "sv_hibernate_when_empty": (val) => val == 1, // puts the server into extremely low cpu usage mode when no clients connected
  "sv_hl2mp_item_respawn_time": (val) => val == 30, //
  "sv_hl2mp_weapon_respawn_time": (val) => val == 20, //
  "sv_holdrotationsensitivity": (val) => true, //
  "sv_infinite_ammo": (val) => val == 0, // player's active weapon will never run out of ammo
  "sv_ladder_useonly": (val) => true, // if set, ladders can only be mounted by pressing +use
  "sv_ladderautomountdot": (val) => true, // when auto-mounting a ladder by looking up its axis, this is the tolerance for looking now directly along the ladder axis.
  "sv_lagcompensationforcerestore": (val) => true, // don't test validity of a lag comp restore, just do it.
  "sv_lan": (val) => true, // server is a lan server ( no heartbeat, no authentication, no non-class c addresses )
  "sv_laser_cube_autoaim": (val) => true, //
  "sv_log_onefile": (val) => true, // log server information to only one file.
  "sv_logbans": (val) => true, // log server bans in the server logs.
  "sv_logblocks": (val) => true, // if true when log when a query is blocked (can cause very large log files)
  "sv_logdownloadlist": (val) => true, //
  "sv_logecho": (val) => true, // echo log information to the console.
  "sv_logfile": (val) => true, // log server information in the log file.
  "sv_logflush": (val) => true, // flush the log file to disk on each write (slow).
  "sv_logsdir": (val) => true, // folder in the game directory where server logs will be stored.
  "sv_massreport": (val) => true, //
  "sv_master_legacy_mode": (val) => true, // use (outside-of-steam) code to communicate with master servers.
  "sv_master_share_game_socket": (val) => true, // use the game's socket to communicate to the master server. if this is 0, then it will create a socket on -steamport + 1 to comm
  "sv_max_queries_sec": (val) => val == 3, // maximum queries per second to respond to from a single ip address.
  "sv_max_queries_sec_global": (val) => val == 60, // maximum queries per second to respond to from anywhere.
  "sv_max_queries_window": (val) => val == 30, // window over which to average queries per second averages.
  "sv_maxclientframes": (val) => val == 128, //
  "sv_maxcmdrate": (val) => true, // (if sv_mincmdrate is > 0), this sets the maximum value for cl_cmdrate.
  "sv_maxrate": (val) => val == 0, // max bandwidth rate allowed on server, 0 == unlimited
  "sv_maxreplay": (val) => true, // maximum replay time in seconds
  "sv_maxroutable": (val) => val == 1200, // server upper bound on net_maxroutable that a client can use.
  "sv_maxupdaterate": (val) => val == 60, // maximum updates per second that the server will allow
  "sv_memlimit": (val) => val == 0, // if set, whenever a game ends, if the total memory used by the server is greater than this # of megabytes, the server will exit.
  "sv_mincmdrate": (val) => val == 0, // this sets the minimum value for cl_cmdrate. 0 == unlimited.
  "sv_minrate": (val) => val == 5000, // min bandwidth rate allowed on server, 0 == unlimited
  "sv_minupdaterate": (val) => val == 10, // minimum updates per second that the server will allow
  "sv_monster_turret_velocity": (val) => val == 100, // the amount of velocity the monster turret tries to move with.
  "sv_multiplayer_maxtempentities": (val) => val == 32, //
  "sv_multiplayer_sounds": (val) => true, //
  "sv_new_delta_bits": (val) => val == 1, //
  "sv_noclipaccelerate": (val) => true, //
  "sv_noclipduringpause": (val) => true, // if cheats are enabled, then you can noclip with the game paused (for doing screenshots, etc.).
  "sv_noclipspeed": (val) => true, //
  "sv_npc_talker_maxdist": (val) => true, // npcs over this distance from the player won't attempt to speak.
  "sv_paint_detection_sphere_radius": (val) => val == 16, // the radius of the query sphere used to find the color of a light map at a contact point in world space.
  "sv_paint_trigger_sound_delay": (val) => val == 0, //
  "sv_paintairacceleration": (val) => val == 5, // air acceleration in paint
  "sv_paintblob_damage": (val) => val == 0, //
  "sv_parallel_packentities": (val) => val == 1, //
  "sv_parallel_sendsnapshot": (val) => val == 1, //
  "sv_password": (val) => true, // server password for entry into multiplayer games
  "sv_pausable": (val) => true, // is the server pausable.
  "sv_personality_core_pca_pitch": (val) => val == 180, // pitch value for personality core perferred carry angles.
  "sv_personality_core_pca_roll": (val) => val == 195, // roll value for personality core perferred carry angles.
  "sv_personality_core_pca_yaw": (val) => val == -90, // yaw value for personality core perferred carry angles.
  "sv_player_collide_with_laser": (val) => true, //
  "sv_player_funnel_gimme_dot": (val) => val == 0, //
  "sv_player_funnel_height_adjust": (val) => val == 128, //
  "sv_player_funnel_into_portals": (val) => true, // causes the player to auto correct toward the center of floor portals.
  "sv_player_funnel_snap_threshold": (val) => val == 10, //
  "sv_player_funnel_speed_bonus": (val) => val == 2, //
  "sv_player_funnel_well_above": (val) => val == 256, //
  "sv_player_trace_through_portals": (val) => val == 1, // causes player movement traces to trace through portals.
  "sv_player_use_cone_size": (val) => val == 0, //
  "sv_playerperfhistorycount": (val) => true, // number of samples to maintain in player perf history
  "sv_portal2_button_hint_range": (val) => true, //
  "sv_portal2_pickup_hint_range": (val) => true, //
  "sv_portal_coop_ping_cooldown_time": (val) => true, // time (in seconds) between coop pings
  "sv_portal_coop_ping_hud_indicitator_duration": (val) => true, //
  "sv_portal_coop_ping_indicator_show_to_all_players": (val) => true, //
  "sv_portal_debug_touch": (val) => val == 0, //
  "sv_portal_high_speed_physics_early_untouch": (val) => val == 1, //
  "sv_portal_microphone_max_range": (val) => true, //
  "sv_portal_microphone_sensitivity": (val) => true, //
  "sv_portal_new_player_trace": (val) => val == 1, //
  "sv_portal_new_player_trace_vs_remote_ents": (val) => val == 0, //
  "sv_portal_new_trace_debugboxes": (val) => val == 0, //
  "sv_portal_new_velocity_check": (val) => val == 1, //
  "sv_portal_pathtrack_track_width_on": (val) => val == 4, //
  "sv_portal_placement_debug": (val) => val == 0, //
  "sv_portal_placement_never_bump": (val) => val == 0, //
  "sv_portal_placement_never_fail": (val) => val == 0, //
  "sv_portal_placement_on_paint": (val) => val == 1, // enable/disable placing portal on painted surfaces
  "sv_portal_race_checkpoint_model_scale": (val) => true, //
  "sv_portal_shot_fizzles_enemy_portals": (val) => val == 0, // [portalmp] your portal shots will fizzle any enemy player portals that they hit
  "sv_portal_shot_push": (val) => val == -1, // [portalmp] amount of force to apply to a player if your shot hits them. <= 0 passes through the player
  "sv_portal_staticcollisioncache_cachebrushes": (val) => true, // cache all solid brushes as polyhedrons on level load
  "sv_portal_staticcollisioncache_cachestaticprops": (val) => true, // cache all solid static props' vcollides as polyhedrons on level load
  "sv_portal_teleportation_resets_collision_events": (val) => val == 1, //
  "sv_portal_trace_vs_displacements": (val) => val == 1, // use traces against portal environment displacement geometry
  "sv_portal_trace_vs_holywall": (val) => val == 1, // use traces against portal environment carved wall
  "sv_portal_trace_vs_staticprops": (val) => val == 1, // use traces against portal environment static prop geometry
  "sv_portal_trace_vs_world": (val) => val == 1, // use traces against portal environment world geometry
  "sv_portal_turret_fire_cone_z_tolerance": (val) => val == 45, // the max height of the turrets firing view cone (in degrees)
  "sv_portal_turret_max_burn_time": (val) => val == 1, // the max time that the turret will burn for.
  "sv_portal_turret_min_burn_time": (val) => val == 1, // the min time that the turret will burn for.
  "sv_portal_turret_shoot_at_death": (val) => val == 1, // if the turrets should shoot after they die.
  "sv_portal_turret_shoot_through_portals_proximity": (val) => val == 36864, // only allow turrets to shoot through portals at players this close to portals (in square units)
  "sv_portal_unified_velocity": (val) => val == 1, // an attempt at removing patchwork velocity tranformation in portals, moving to a unified approach.
  "sv_post_teleportation_box_time": (val) => val == 0, // time to use a slightly expanded box for contacts right after teleportation.
  "sv_precacheinfo": (val) => false, // cmd show precache info.
  "sv_press_jump_to_bounce": (val) => val == 3, // 0: bounce on touch, 1: bounce on press, 2: bounce on hold
  "sv_projected_entities_use_placement_helper": (val) => val == 1, //
  "sv_props_funnel_into_portals": (val) => val == 1, //
  "sv_props_funnel_into_portals_deceleration": (val) => val == 2, // when a funneling prop is leaving a portal, decelerate any velocity that is in opposition to funneling by this amount per second
  "sv_pure": (val) => true, // cmd show user data.
  "sv_pure_kick_clients": (val) => val == 1, // if set to 1, the server will kick clients with mismatching files. otherwise, it will issue a warning to the client.
  "sv_pure_trace": (val) => val == 0, // if set to 1, the server will print a message whenever a client is verifying a crc for a file.
  "sv_pvsskipanimation": (val) => val == 1, // skips setupbones when npc's are outside the pvs
  "sv_querycache_stats": (val) => false, // cmd display status of the query cache (client only)
  "sv_randomize_nugget_availability": (val) => val == 0, // [portalmp] randomize which nuggets are available on map start
  "sv_randomize_nugget_availability_groupavailability": (val) => val == 0, // [portalmp] 0.0 to 1.0 chances that a group of nuggets exists after randomization
  "sv_randomize_nugget_availability_ungroupedavailability": (val) => val == 0, // [portalmp] 0.0 to 1.0 chances that an individual ungrouped nugget exists after randomization
  "sv_rcon_banpenalty": (val) => true, // number of minutes to ban users who fail rcon authentication
  "sv_rcon_log": (val) => true, // enable/disable rcon logging.
  "sv_rcon_maxfailures": (val) => true, // max number of times a user can fail rcon authentication before being banned
  "sv_rcon_minfailures": (val) => true, // number of times a user can fail rcon authentication in sv_rcon_minfailuretime before being banned
  "sv_rcon_minfailuretime": (val) => true, // number of seconds to track failed rcon authentications
  "sv_regeneration_force_on": (val) => val == 0, // cheat to test regenerative health systems
  "sv_regeneration_wait_time": (val) => val == 1, //
  "sv_region": (val) => true, // the region of the world to report this server in.
  "sv_reload_node_position_keys": (val) => false, // cmd reloads node positions for challenge mode finish lines.
  "sv_report_client_settings": (val) => val == 0, //
  "sv_reservation_grace": (val) => val == 5, // time in seconds given for a lobby reservation.
  "sv_reservation_timeout": (val) => val == 45, // time in seconds before lobby reservation expires.
  "sv_robust_explosions": (val) => val == 1, //
  "sv_script_think_interval": (val) => val == 0, //
  "sv_search_key": (val) => val == 0, // when searching for a dedicated server from lobby, restrict search to only dedicated servers having the same sv_search_key.
  "sv_search_team_key": (val) => val == 0, // when initiating team search, set this key to match with known opponents team
  "sv_show_placement_help_in_preview": (val) => val == 0, // forces the placement preview to show any help in placement given from info_placement_helper entities.
  "sv_showhitboxes": (val) => val == -1, // send server-side hitboxes for specified entity to client (note:  this uses lots of bandwidth, use on listen server only).
  "sv_showladders": (val) => val == 0, // show bbox and dismount points for all ladders (must be set before level load.)
  "sv_showlagcompensation": (val) => val == 0, // show lag compensated hitboxes whenever a player is lag compensated.
  "sv_showtags": (val) => false, // cmd describe current gametags.
  "sv_shutdown": (val) => false, // cmd sets the server to shutdown when all games have completed
  "sv_skyname": (val) => true, // current name of the skybox texture
  "sv_slippery_cube_button": (val) => val == 1, //
  "sv_sound_discardextraunreliable": (val) => true, //
  "sv_soundemitter_filecheck": (val) => true, // cmd report missing wave files for sounds and game_sounds files.
  "sv_soundemitter_flush": (val) => true, // cmd flushes the sounds.txt system (server only)
  "sv_soundemitter_reload": (val) => true, // cmd flushes the sounds.txt system
  "sv_soundemitter_trace": (val) => true, // show all emitsound calls including their symbolic name and the actual wave file they resolved to. (-1 = for nobody, 0 = for eve
  "sv_soundscape_printdebuginfo": (val) => true, // cmd print soundscapes
  "sv_specaccelerate": (val) => true, //
  "sv_specnoclip": (val) => true, //
  "sv_specspeed": (val) => true, //
  "sv_speed_normal": (val) => val == 175, // for tweaking the normal speed when off speed paint.
  "sv_speed_paint_acceleration": (val) => val == 500, // how fast the player accelerates on speed paint.
  "sv_speed_paint_max": (val) => val == 800, // for tweaking the max speed for speed paint.
  "sv_speed_paint_on_bounce_deceleration_delay": (val) => val == 0, // how long before starting to decelerate if going from speed to bounce.
  "sv_speed_paint_ramp_acceleration": (val) => val == 1000, // how fast the player accelerates on speed paint when on a ramp.
  "sv_speed_paint_side_move_factor": (val) => val == 0, //
  "sv_stats": (val) => true, // collect cpu usage stats
  "sv_steamgroup": (val) => true, // the id of the steam group that this server belongs to. you can find your group's id on the admin profile page in the steam comm
  "sv_steamgroup_exclusive": (val) => true, // if set, only members of steam group will be able to join the server when it's empty, public people will be able to join the ser
  "sv_stickysprint_default": (val) => val == 0, //
  "sv_strict_notarget": (val) => true, // if set, notarget will cause entities to never think they are in the pvs
  "sv_tags": (val) => true, // server tags. used to provide extra information to clients when they're browsing for servers. separate tags with a comma.
  "sv_test_scripted_sequences": (val) => val == 0, // tests for scripted sequences that are embedded in the world. run through your map with this set to check for npcs falling throu
  "sv_teststepsimulation": (val) => val == 1, //
  "sv_thinktimecheck": (val) => val == 0, // check for thinktimes all on same timestamp.
  "sv_thinnerprojectedwalls": (val) => val == 0, //
  "sv_threaded_init": (val) => val == 0, //
  "sv_timeout": (val) => val == 65, // after this many seconds without a message from a client, the client is dropped
  "sv_turbophysics": (val) => val == 0, // turns on turbo physics
  "sv_unlockedchapters": (val) => true, // highest unlocked game chapter.
  "sv_use_bendy_model": (val) => true, // use the bendy stick-man as the player model
  "sv_use_edgefriction": (val) => val == 1, //
  "sv_use_find_closest_passable_space": (val) => val == 1, // enables heavy-handed player teleporting stuck fix code.
  "sv_use_shadow_clones": (val) => val == 1, //
  "sv_use_trace_duration": (val) => val == 0, //
  "sv_use_transformed_collideables": (val) => val == 1, // disables traces against remote portal moving entities using transforms to bring them into local space.
  "sv_validate_edict_change_infos": (val) => val == 0, // verify that edict changeinfos are being calculated properly (used to debug local network backdoor mode).
  "sv_vehicle_autoaim_scale": (val) => val == 8, //
  "sv_visiblemaxplayers": (val) => true, // overrides the max players reported to prospective clients
  "sv_voicecodec": (val) => false, // specifies which voice codec dll to use in a game. set to the name of the dll without the extension.
  "sv_voiceenable": (val) => true, //
  "sv_wall_bounce_trade": (val) => val == 0, // how much outward velocity is traded for upward velocity on wall bounces
  "sv_wall_jump_help": (val) => val == 1, // enable the wall jump helper to help keep players bouncing between two opposing walls
  "sv_wall_jump_help_amount": (val) => val == 5, // maximum correction amount per wall bounce
  "sv_wall_jump_help_debug": (val) => val == 0, //
  "sv_wall_jump_help_threshold": (val) => val == 9, // threshold at which the wall jump helper will bring the player's velocity in line with the surface normal
  "sv_weapon_pickup_time_delay": (val) => val == 0, //
  "sv_zoom_stop_movement_threashold": (val) => true, // move command amount before breaking player out of toggle zoom.
  "sv_zoom_stop_time_threashold": (val) => true, // time amount before breaking player out of toggle zoom.
  "swap_ss_input": (val) => false, // cmd
  "sys_minidumpexpandedspew": (val) => true, //
  "sys_minidumpspewlines": (val) => true, // lines of crash dump console spew to keep.
  "tbeam_air_ctrl_threshold": (val) => val == 20, //
  "tbeam_allow_player_struggle": (val) => val == 0, //
  "tbeam_prevent_players_from_colliding": (val) => val == 1, //
  "template_debug": (val) => val == 0, //
  "test_createentity": (val) => false, // cmd
  "test_dispatcheffect": (val) => false, // cmd test a clientside dispatch effect.  usage: test_dispatcheffect <effect name> <distance away> <flags> <magnitude> <scale>  defau
  "test_ehandle": (val) => false, // cmd
  "test_entity_blocker": (val) => false, // cmd test command that drops an entity blocker out in front of the player.
  "test_for_vphysics_clips_when_dropping": (val) => val == 1, //
  "test_freezeframe": (val) => false, // cmd test the freeze frame code.
  "test_initrandomentityspawner": (val) => false, // cmd
  "test_loop": (val) => false, // cmd test_loop <loop name> - loop back to the specified loop start point unconditionally.
  "test_loopcount": (val) => false, // cmd test_loopcount <loop name> <count> - loop back to the specified loop start point the specified # of times.
  "test_loopfornumseconds": (val) => false, // cmd test_loopfornumseconds <loop name> <time> - loop back to the specified start point for the specified # of seconds.
  "test_outtro_stats": (val) => false, // cmd
  "test_proxytoggle_enableproxy": (val) => false, // cmd
  "test_proxytoggle_ensurevalue": (val) => false, // cmd test_proxytoggle_ensurevalue
  "test_proxytoggle_setvalue": (val) => false, // cmd
  "test_randomchance": (val) => false, // cmd test_randomchance <percent chance, 0-100> <token1> <token2...> - roll the dice and maybe run the command following the percenta
  "test_randomizeinpvs": (val) => false, // cmd
  "test_randomplayerposition": (val) => false, // cmd
  "test_removeallrandomentities": (val) => false, // cmd
  "test_runframe": (val) => false, // cmd
  "test_sendkey": (val) => false, // cmd
  "test_spawnrandomentities": (val) => false, // cmd
  "test_startloop": (val) => false, // cmd test_startloop <loop name> - denote the start of a loop. really just defines a named point you can jump to.
  "test_startscript": (val) => false, // cmd start a test script running..
  "test_wait": (val) => false, // cmd
  "test_waitforcheckpoint": (val) => false, // cmd
  "testhudanim": (val) => false, // cmd test a hud element animation.  arguments: <anim name>
  "testscript_debug": (val) => val == 0, // debug test scripts.
  "texture_budget_background_alpha": (val) => true, // how translucent the budget panel is
  "texture_budget_panel_bottom_of_history_fraction": (val) => true, // number between 0 and 1
  "texture_budget_panel_global": (val) => true, // show global times in the texture budget panel.
  "texture_budget_panel_height": (val) => true, // height in pixels of the budget panel
  "texture_budget_panel_width": (val) => true, // width in pixels of the budget panel
  "texture_budget_panel_x": (val) => true, // number of pixels from the left side of the game screen to draw the budget panel
  "texture_budget_panel_y": (val) => true, // number of pixels from the top side of the game screen to draw the budget panel
  "tf_arena_max_streak": (val) => val == 5, // teams will be scrambled if one team reaches this streak
  "tf_arena_preround_time": (val) => val == 10, // length of the pre-round time
  "tf_escort_score_rate": (val) => val == 1, // score for escorting the train, in points per second
  "tf_explanations_backpackpanel": (val) => val == 1, // whether the user has seen explanations for this panel.
  "think_limit": (val) => val == 0, // maximum think time in milliseconds, warning is printed if this is exceeded.
  "thirdperson": (val) => false, // cmd switch to thirdperson camera.
  "thirdperson_mayamode": (val) => false, // cmd switch to thirdperson maya-like camera controls.
  "thirdperson_platformer": (val) => true, // player will aim in the direction they are moving.
  "thirdperson_screenspace": (val) => true, // movement will be relative to the camera, eg: left means screen-left
  "thirdpersonshoulder": (val) => false, // cmd switch to thirdperson-shoulder camera.
  "thread_test_tslist": (val) => false, // cmd
  "thread_test_tsqueue": (val) => false, // cmd
  "threadpool_affinity": (val) => true, // enable setting affinity
  "threadpool_cycle_reserve": (val) => false, // cmd cycles threadpool reservation by powers of 2
  "threadpool_reserve": (val) => true, // consume the specified number of threads in the thread pool
  "threadpool_run_tests": (val) => false, // cmd
  "timedemo": (val) => false, // cmd play a demo and report performance info.
  "timedemo_vprofrecord": (val) => false, // cmd play a demo and report performance info.  also record vprof data for the span of the demo
  "timedemoquit": (val) => false, // cmd play a demo, report performance info, and then exit
  "timerefresh": (val) => false, // cmd profile the renderer.
  "tir_maxpitch": (val) => val == 15, // trackir max pitch
  "tir_maxroll": (val) => val == 90, // trackir max roll
  "tir_maxx": (val) => val == 4, // trackir max x
  "tir_maxy": (val) => val == 6, // trackir max y
  "tir_maxyaw": (val) => val == 90, // trackir max yaw
  "tir_maxz": (val) => val == 1, // trackir max z
  "tir_start": (val) => val == 0, // trackir start
  "tir_stop": (val) => val == 0, // trackir stop
  "toggle": (val) => cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")), // cmd toggles a convar on or off, or cycles through a set of values.
  "toggleconsole": (val) => true, // cmd show/hide the console.
  "toolload": (val) => false, // cmd load a tool.
  "toolunload": (val) => false, // cmd unload a tool.
  "trace_report": (val) => true, //
  "tracer_extra": (val) => true, //
  "tv_allow_camera_man": (val) => true, // auto director allows spectators to become camera man
  "tv_allow_static_shots": (val) => true, // auto director uses fixed level cameras for shots
  "tv_autorecord": (val) => val == 0, // automatically records all games as sourcetv demos.
  "tv_autoretry": (val) => true, // relay proxies retry connection after network timeout
  "tv_chatgroupsize": (val) => true, // set the default chat group size
  "tv_chattimelimit": (val) => true, // limits spectators to chat only every n seconds
  "tv_clients": (val) => false, // cmd shows list of connected sourcetv clients.
  "tv_debug": (val) => true, // sourcetv debug info.
  "tv_delay": (val) => true, // sourcetv broadcast delay in seconds
  "tv_delaymapchange": (val) => true, // delays map change until broadcast is complete
  "tv_deltacache": (val) => true, // enable delta entity bit stream cache
  "tv_dispatchmode": (val) => true, // dispatch clients to relay proxies: 0=never, 1=if appropriate, 2=always
  "tv_enable": (val) => true, // activates sourcetv on server.
  "tv_maxclients": (val) => true, // maximum client number on sourcetv server.
  "tv_maxrate": (val) => true, // max sourcetv spectator bandwidth rate allowed, 0 == unlimited
  "tv_msg": (val) => false, // cmd send a screen message to all clients.
  "tv_name": (val) => true, // sourcetv host name
  "tv_nochat": (val) => true, // don't receive chat messages from other sourcetv spectators
  "tv_overridemaster": (val) => true, // overrides the sourcetv master root address.
  "tv_password": (val) => true, // sourcetv password for all clients
  "tv_port": (val) => true, // host sourcetv port
  "tv_record": (val) => false, // cmd starts sourcetv demo recording.
  "tv_relay": (val) => false, // cmd connect to sourcetv server and relay broadcast.
  "tv_relaypassword": (val) => true, // sourcetv password for relay proxies
  "tv_relayvoice": (val) => true, // relay voice data: 0=off, 1=on
  "tv_retry": (val) => false, // cmd reconnects the sourcetv relay proxy.
  "tv_snapshotrate": (val) => true, // snapshots broadcasted per second
  "tv_status": (val) => false, // cmd show sourcetv server status.
  "tv_stop": (val) => false, // cmd stops the sourcetv broadcast.
  "tv_stoprecord": (val) => false, // cmd stops sourcetv demo recording.
  "tv_timeout": (val) => true, // sourcetv connection timeout in seconds.
  "tv_title": (val) => true, // set title for sourcetv spectator ui
  "tv_transmitall": (val) => true, // transmit all entities (not only director view)
  "ui_gameui_debug": (val) => true, //
  "ui_play_online_browser": (val) => true, // whether play online displays a browser or plain search dialog.
  "ui_posedebug_fade_in_time": (val) => true, // time during which a new pose activity layer is shown in green in +posedebug ui
  "ui_posedebug_fade_out_time": (val) => true, // time to keep a no longer active pose activity layer in red until removing it from +posedebug ui
  "ui_public_lobby_filter_campaign": (val) => true, // filter type for campaigns on the public lobby display
  "ui_public_lobby_filter_difficulty2": (val) => true, // filter type for difficulty on the public lobby display
  "ui_public_lobby_filter_status": (val) => true, // filter type for game status on the public lobby display
  "ui_reloadscheme": (val) => false, // cmd reloads the resource files for the active ui window
  "ui_show_community_map_names": (val) => true, //
  "ui_signin_dialog_autoclose": (val) => true, //
  "ui_start_dlc_time_corrupt": (val) => true, //
  "ui_start_dlc_time_loaded": (val) => true, //
  "ui_start_dlc_time_pump": (val) => true, //
  "ui_volume_scale": (val) => true, //
  "ui_transition_effect": (val) => true,
  "ui_transition_time": (val) => true,
  "ui_loadingscreen_transition_time": (val) => true,
  "ui_loadingscreen_fadein_time": (val) => true,
  "ui_loadingscreen_mintransition_time": (val) => true,
  "unbind": (val) => true, // cmd unbind a key.
  "unbindall": (val) => true, // cmd unbind all keys.
  "unload_all_addons": (val) => false, // cmd reloads the search paths for game addons.
  "unpause": (val) => true, // cmd unpause the game.
  "update_addon_paths": (val) => false, // cmd reloads the search paths for game addons.
  "upgrade_portalgun": (val) => true, // cmd upgrades the portalgun to a dual portalgun.  arguments:    none
  "upgrade_potatogun": (val) => false, // cmd upgrades to the portalgun to the dual portalgun with potatos attached
  "use": (val) => false, // cmd use a particular weapon  arguments: <weapon_name>
  "+use": (val) => true, // cmd
  "-use": (val) => true, // cmd
  "use_server_portal_particles": (val) => true, //
  "user": (val) => true, // cmd show user data.
  "users": (val) => true, // cmd show user info for players on server.
  "v_centermove": (val) => val == 0, //
  "v_centerspeed": (val) => val == 500, //
  "v_ipitch_cycle": (val) => val == 1, //
  "v_ipitch_level": (val) => val == 0, //
  "v_iroll_cycle": (val) => val == 0, //
  "v_iroll_level": (val) => val == 0, //
  "v_iyaw_cycle": (val) => val == 2, //
  "v_iyaw_level": (val) => val == 0, //
  "vcollide_wireframe": (val) => val == 0, // render physics collision models in wireframe
  "vehicle_flushscript": (val) => false, // cmd flush and reload all vehicle scripts
  "version": (val) => true, // cmd print version info string.
  "vgui_drawfocus": (val) => val == 0, // report which panel is under the mouse.
  "vgui_drawkeyfocus": (val) => val == 0, // report which panel has keyboard focus.
  "vgui_drawtree": (val) => val == 0, // draws the vgui panel hiearchy to the specified depth level.
  "+vgui_drawtree": (val) => false, // cmd
  "-vgui_drawtree": (val) => false, // cmd
  "vgui_drawtree_bounds": (val) => val == 0, // show panel bounds.
  "vgui_drawtree_clear": (val) => false, // cmd
  "vgui_drawtree_draw_selected": (val) => val == 0, // highlight the selected panel
  "vgui_drawtree_freeze": (val) => val == 0, // set to 1 to stop updating the vgui_drawtree view.
  "vgui_drawtree_hidden": (val) => val == 0, // draw the hidden panels.
  "vgui_drawtree_panelalpha": (val) => val == 0, // show the panel alpha values in the vgui_drawtree view.
  "vgui_drawtree_panelptr": (val) => val == 0, // show the panel pointer values in the vgui_drawtree view.
  "vgui_drawtree_popupsonly": (val) => val == 0, // draws the vgui popup list in hierarchy(1) or most recently used(2) order.
  "vgui_drawtree_render_order": (val) => val == 0, // list the vgui_drawtree panels in render order.
  "vgui_drawtree_scheme": (val) => val == 0, // show scheme file for each panel
  "vgui_drawtree_visible": (val) => val == 1, // draw the visible panels.
  "vgui_dump_panels": (val) => false, // cmd vgui_dump_panels [visible]
  "vgui_spew_fonts": (val) => false, // cmd
  "vgui_togglepanel": (val) => false, // cmd show/hide vgui panel by name.
  "viewanim_addkeyframe": (val) => false, // cmd
  "viewanim_create": (val) => false, // cmd viewanim_create
  "viewanim_load": (val) => false, // cmd load animation from file
  "viewanim_reset": (val) => false, // cmd reset view angles!
  "viewanim_save": (val) => false, // cmd save current animation to file
  "viewanim_test": (val) => false, // cmd test view animation
  "viewmodel_fov": (val) => true, //
  "viewmodel_offset_x": (val) => true, //
  "viewmodel_offset_y": (val) => true, //
  "viewmodel_offset_z": (val) => true, //
  "violence_ablood": (val) => true, // draw alien blood
  "violence_agibs": (val) => true, // show alien gib entities
  "violence_hblood": (val) => true, // draw human blood
  "violence_hgibs": (val) => true, // show human gib entities
  "viper_bug": (val) => false, // cmd starts a remote bug on machine aliased <name>. see scripts/remotebugids.txt for alias list.
  "vis_force": (val) => val == 0, //
  "vismon_poll_frequency": (val) => val == 0, //
  "vismon_trace_limit": (val) => val == 12, //
  "vm_debug": (val) => val == 0, //
  "vm_draw_always": (val) => true, //
  "voice_all_icons": (val) => true, // draw all players' voice icons
  "voice_avggain": (val) => true, //
  "voice_clientdebug": (val) => true, //
  "voice_debugfeedback": (val) => true, //
  "voice_debugfeedbackfrom": (val) => true, //
  "voice_enable": (val) => true, // toggle voice transmit and receive.
  "voice_fadeouttime": (val) => true, //
  "voice_forcemicrecord": (val) => true, //
  "voice_head_icon_height": (val) => true, // voice icons are this many inches over player eye positions
  "voice_head_icon_size": (val) => true, // size of voice icon over player heads in inches
  "voice_icons_use_particles": (val) => true, // draw voice icons using particles
  "voice_inputfromfile": (val) => true, // get voice input from 'voice_input.wav' rather than from the microphone.
  "voice_local_icon": (val) => true, // draw local player's voice icon
  "voice_loopback": (val) => true, //
  "voice_maxgain": (val) => true, //
  "voice_minimum_gain": (val) => true, //
  "voice_mixer_boost": (val) => true, //
  "voice_mixer_mute": (val) => true, //
  "voice_mixer_volume": (val) => true, //
  "voice_modenable": (val) => true, // enable/disable voice in this mod.
  "voice_mute": (val) => true, // cmd mute a specific steam user
  "voice_overdrive": (val) => true, //
  "voice_overdrivefadetime": (val) => true, //
  "voice_player_speaking_delay_threshold": (val) => true, //
  "voice_profile": (val) => true, //
  "voice_ptt": (val) => true, //
  "voice_recordtofile": (val) => true, // record mic data and decompressed voice data into 'voice_micdata.wav' and 'voice_decompressed.wav'
  "voice_reset_mutelist": (val) => true, // cmd reset all mute information for all players who were ever muted.
  "voice_scale": (val) => true, //
  "voice_serverdebug": (val) => true, //
  "voice_show_mute": (val) => true, // cmd show whether current players are muted.
  "voice_showchannels": (val) => true, //
  "voice_showincoming": (val) => true, //
  "voice_steal": (val) => true, //
  "voice_threshold": (val) => true, //
  "voice_thresold_delay": (val) => true, //
  "voice_unmute": (val) => true, // cmd unmute a specific steam user, or `all` to unmute all connected players.
  "voice_vox": (val) => true, // voice chat uses a vox-style always on
  "voice_writevoices": (val) => true, // saves each speaker's voice data into separate .wav files
  "voice_xsend_debug": (val) => true, //
  "+voicerecord": (val) => true, // cmd
  "-voicerecord": (val) => true, // cmd
  "voicerecord_toggle": (val) => true, // cmd
  "volume": (val) => true, // sound volume
  "vox_reload": (val) => false, // cmd reload sentences.txt file
  "voxeltree_box": (val) => false, // cmd view entities in the voxel-tree inside box <vector(min), vector(max)>.
  "voxeltree_playerview": (val) => false, // cmd view entities in the voxel-tree at the player position.
  "voxeltree_sphere": (val) => false, // cmd view entities in the voxel-tree inside sphere <vector(center), float(radius)>.
  "voxeltree_view": (val) => false, // cmd view entities in the voxel-tree.
  "vphys_sleep_timeout": (val) => false, // cmd set sleep timeout: large values mean stuff won't ever sleep
  "vphysics_threadmode": (val) => val == 1, //
  "vprof": (val) => false, // cmd toggle vprof profiler
  "vprof_adddebuggroup1": (val) => false, // cmd add a new budget group dynamically for debugging
  "vprof_cachemiss": (val) => false, // cmd toggle vprof cache miss checking
  "vprof_cachemiss_off": (val) => false, // cmd turn off vprof cache miss checking
  "vprof_cachemiss_on": (val) => false, // cmd turn on vprof cache miss checking
  "vprof_child": (val) => false, // cmd
  "vprof_collapse_all": (val) => false, // cmd collapse the whole vprof tree
  "vprof_counters": (val) => true, //
  "vprof_counters_show_minmax": (val) => true, //
  "vprof_dump_counters": (val) => false, // cmd dump vprof counters to the console
  "vprof_dump_groupnames": (val) => false, // cmd write the names of all of the vprof groups to the console.
  "vprof_dump_oninterval": (val) => true, // interval (in seconds) at which vprof will batch up data and dump it to the console.
  "vprof_dump_spikes": (val) => true, // framerate at which vprof will begin to dump spikes to the console. 0 = disabled, negative to reset after dump
  "vprof_dump_spikes_budget_group": (val) => true, // budget gtnode to start report from when doing a dump spikes
  "vprof_dump_spikes_hiearchy": (val) => true, // set to 1 to get a hierarchy report whith vprof_dump_spikes
  "vprof_dump_spikes_node": (val) => true, // node to start report from when doing a dump spikes
  "vprof_dump_spikes_terse": (val) => true, // whether to use most terse output
  "vprof_expand_all": (val) => false, // cmd expand the whole vprof tree
  "vprof_expand_group": (val) => false, // cmd expand a budget group in the vprof tree by name
  "vprof_generate_report": (val) => false, // cmd generate a report to the console.
  "vprof_generate_report_ai": (val) => false, // cmd generate a report to the console.
  "vprof_generate_report_ai_only": (val) => false, // cmd generate a report to the console.
  "vprof_generate_report_budget": (val) => false, // cmd generate a report to the console based on budget group.
  "vprof_generate_report_hierarchy": (val) => false, // cmd generate a report to the console.
  "vprof_generate_report_hierarchy_per_frame_and_count_only": (val) => false, // cmd generate a minimal hiearchical report to the console.
  "vprof_generate_report_map_load": (val) => false, // cmd generate a report to the console.
  "vprof_graph": (val) => true, // draw the vprof graph.
  "vprof_graphheight": (val) => true, //
  "vprof_graphwidth": (val) => true, //
  "vprof_nextsibling": (val) => false, // cmd
  "vprof_off": (val) => false, // cmd turn off vprof profiler
  "vprof_on": (val) => false, // cmd turn on vprof profiler
  "vprof_parent": (val) => false, // cmd
  "vprof_playback_average": (val) => false, // cmd average the next n frames.
  "vprof_playback_start": (val) => false, // cmd start playing back a recorded .vprof file.
  "vprof_playback_step": (val) => false, // cmd while playing back a .vprof file, step to the next tick.
  "vprof_playback_stepback": (val) => false, // cmd while playing back a .vprof file, step to the previous tick.
  "vprof_playback_stop": (val) => false, // cmd stop playing back a recorded .vprof file.
  "vprof_prevsibling": (val) => false, // cmd
  "vprof_record_start": (val) => false, // cmd start recording vprof data for playback later.
  "vprof_record_stop": (val) => false, // cmd stop recording vprof data
  "vprof_remote_start": (val) => false, // cmd request a vprof data stream from the remote server (requires authentication)
  "vprof_remote_stop": (val) => false, // cmd stop an existing remote vprof data request
  "vprof_reset": (val) => false, // cmd reset the stats in vprof profiler
  "vprof_reset_peaks": (val) => false, // cmd reset just the peak time in vprof profiler
  "vprof_scope": (val) => true, // set a specific scope to start showing vprof tree
  "vprof_scope_entity_gamephys": (val) => true, //
  "vprof_scope_entity_thinks": (val) => true, //
  "vprof_server_spike_threshold": (val) => true, //
  "vprof_server_thread": (val) => true, //
  "vprof_think_limit": (val) => true, //
  "vprof_to_csv": (val) => false, // cmd convert a recorded .vprof file to .csv.
  "vprof_unaccounted_limit": (val) => true, // number of milliseconds that a node must exceed to turn red in the vprof panel
  "vprof_verbose": (val) => true, // set to one to show average and peak times
  "vprof_vtune_group": (val) => false, // cmd enable vtune for a particular vprof group ('disable' to disable)
  "vprof_warningmsec": (val) => true, // above this many milliseconds render the label red to indicate slow code.
  "vtune": (val) => false, // cmd controls vtune's sampling.
  "vx_do_not_throttle_events": (val) => val == 0, // force vxconsole updates every frame; smoother vprof data on ps3 but at a slight (~0.2ms) perf cost.
  "vx_model_list": (val) => false, // cmd dump models to vxconsole
  "+walk": (val) => false, // cmd
  "-walk": (val) => false, // cmd
  "wall_debug": (val) => val == 0, //
  "wall_debug_time": (val) => val == 5, //
  "wc_air_edit_further": (val) => false, // cmd when in wc edit mode and editing air nodes,  moves position of air node crosshair and placement location further away from play
  "wc_air_edit_nearer": (val) => false, // cmd when in wc edit mode and editing air nodes,  moves position of air node crosshair and placement location nearer to from player
  "wc_air_node_edit": (val) => false, // cmd when in wc edit mode, toggles laying down or air nodes instead of ground nodes
  "wc_create": (val) => false, // cmd when in wc edit mode, creates a node where the player is looking if a node is allowed at that location for the currently select
  "wc_destroy": (val) => false, // cmd when in wc edit mode, destroys the node that the player is nearest to looking at.  (the node will be highlighted by a red box).
  "wc_destroy_undo": (val) => false, // cmd when in wc edit mode restores the last deleted node
  "wc_link_edit": (val) => false, // cmd
  "weapon_showproficiency": (val) => true, //
  "windows_speaker_config": (val) => true, //
  "wipe_nav_attributes": (val) => false, // cmd clear all nav attributes of selected area.
  "writeid": (val) => false, // cmd writes a list of permanently-banned user ids to banned_user.cfg.
  "writeip": (val) => false, // cmd save the ban list to banned_ip.cfg.
  "xbox_autothrottle": (val) => true, //
  "xbox_steering_deadzone": (val) => true, //
  "xbox_throttlebias": (val) => true, //
  "xbox_throttlespoof": (val) => true, //
  "xc_crouch_debounce": (val) => true, //
  "xload": (val) => false, // cmd load a saved game from a console storage device.
  "xlook": (val) => false, // cmd
  "xlsp_force_dc_name": (val) => val == 0, // restrict to xlsp datacenter by name.
  "xmove": (val) => false, // cmd
  "xsave": (val) => false, // cmd saves current game to a console storage device.
  "z_ragdoll_impact_strength": (val) => true, //
  "+zoom": (val) => true, // cmd
  "-zoom": (val) => true, // cmd
  "+zoom_in": (val) => true, // cmd
  "-zoom_in": (val) => true, // cmd
  "+zoom_out": (val) => true, // cmd
  "-zoom_out": (val) => true, // cmd
  "zoom_sensitivity_ratio": (val) => true, // additional mouse sensitivity scale factor applied when fov is zoomed in.
  // steam controller commands
  "sc_coop": (val) => true,
  "sc_debug_sets": (val) => true,
  "sc_enable": (val) => true,
  "sc_enable2": (val) => true,
  "sc_footer_glyph_force_style": (val) => true,
  "sc_footer_glyph_neutral_abxy": (val) => true,
  "sc_footer_glyph_solid_abxy": (val) => true,
  "sc_joystick_inner_deadzone_scale": (val) => true,
  "sc_joystick_map": (val) => true,
  "sc_joystick_outer_deadzone_scale": (val) => true,
  "sc_mouse_coop": (val) => true,
  "sc_pitch_sensitivity_default": (val) => true,
  "sc_pitch_sensitivity_new2": (val) => true,
  "sc_pitch_sensitivity_new22": (val) => true,
  "sc_say": (val) => true,
  "sc_yaw_sensitivity_default": (val) => true,
  "sc_yaw_sensitivity_new2": (val) => true,
  "sc_yaw_sensitivity_new22": (val) => true,
  // sar ghosts
  "+ghost_leaderboard": (val) => true,
  "+ghost_list": (val) => true,
  "-ghost_leaderboard": (val) => true,
  "-ghost_list": (val) => true,
  "ghost_chat": (val) => true,
  "ghost_connect": (val) => false,
  "ghost_debug": (val) => true,
  "ghost_delete_all": (val) => true,
  "ghost_delete_by_id": (val) => true,
  "ghost_demo_color": (val) => true,
  "ghost_disconnect": (val) => true,
  "ghost_draw_through_walls": (val) => true,
  "ghost_height": (val) => true,
  "ghost_leaderboard_font": (val) => true,
  "ghost_leaderboard_max_display": (val) => true,
  "ghost_leaderboard_mode": (val) => true,
  "ghost_leaderboard_reset": (val) => true,
  "ghost_leaderboard_x": (val) => true,
  "ghost_leaderboard_y": (val) => true,
  "ghost_list": (val) => true,
  "ghost_list_font": (val) => true,
  "ghost_list_mode": (val) => true,
  "ghost_list_show_map": (val) => true,
  "ghost_list_x": (val) => true,
  "ghost_list_y": (val) => true,
  "ghost_message": (val) => true,
  "ghost_name": (val) => true,
  "ghost_name_font_size": (val) => true,
  "ghost_net_dump": (val) => true,
  "ghost_net_dump_mark": (val) => true,
  "ghost_offset": (val) => true,
  "ghost_opacity": (val) => true,
  "ghost_ping": (val) => true,
  "ghost_prop_model": (val) => false,
  "ghost_proximity_fade": (val) => true,
  "ghost_recap": (val) => true,
  "ghost_reset": (val) => true,
  "ghost_set_color": (val) => true,
  "ghost_set_demo": (val) => true,
  "ghost_set_demos": (val) => true,
  "ghost_shading": (val) => true,
  "ghost_show_advancement": (val) => true,
  "ghost_show_names": (val) => true,
  "ghost_show_spec_chat": (val) => true,
  "ghost_spec_connect": (val) => true,
  "ghost_spec_next": (val) => true,
  "ghost_spec_pov": (val) => true,
  "ghost_spec_prev": (val) => true,
  "ghost_spec_see_spectators": (val) => true,
  "ghost_spec_thirdperson": (val) => true,
  "ghost_spec_thirdperson_dist": (val) => true,
  "ghost_start": (val) => false,
  "ghost_sync": (val) => true,
  "ghost_sync_countdown": (val) => true,
  "ghost_tcp_only": (val) => true,
  "ghost_text_offset": (val) => true,
  "ghost_type": (val) => true,
  "ghost_update_rate": (val) => true,
  // sar commands
  "sar_force_fov": (val) => val >= 45 && val <= 140, // 	functional 	45 .. 140
  "sar_speedrun_autoreset_clear": (val) => true,
  "sar_speedrun_autoreset_load": (val) => true,
  "sar_speedrun_autostop": (val) => val != 0,
  "sar_speedrun_category": (val) => true,
  "sar_speedrun_category_add_rule": (val) => true,
  "sar_speedrun_category_create": (val) => true,
  "sar_speedrun_category_remove": (val) => true,
  "sar_speedrun_category_remove_rule": (val) => true,
  "sar_speedrun_cc_finish": (val) => true,
  "sar_speedrun_cc_place": (val) => true,
  "sar_speedrun_cc_place_start": (val) => true,
  "sar_speedrun_cc_rule": (val) => true,
  "sar_speedrun_cc_start": (val) => true,
  "sar_speedrun_draw_triggers": (val) => true,
  "sar_speedrun_export": (val) => true,
  "sar_speedrun_export_all": (val) => true,
  "sar_speedrun_offset": (val) => val == 0,
  "sar_speedrun_pause": (val) => false,
  "sar_speedrun_recover": (val) => true,
  "sar_speedrun_reset": (val) => true,
  "sar_speedrun_reset_categories": (val) => true,
  "sar_speedrun_reset_export": (val) => true,
  "sar_speedrun_result": (val) => true,
  "sar_speedrun_resume": (val) => true,
  "sar_speedrun_rule": (val) => true,
  "sar_speedrun_rule_create": (val) => true,
  "sar_speedrun_rule_remove": (val) => true,
  "sar_speedrun_skip_cutscenes": (val) => true,
  "sar_speedrun_smartsplit": (val) => val == 1,
  "sar_speedrun_split": (val) => true,
  "sar_speedrun_start": (val) => false,
  "sar_speedrun_start_on_load": (val) => true,
  "sar_speedrun_stop": (val) => true,
  "sar_speedrun_stop_in_menu": (val) => true,
  "sar_speedrun_time_pauses": (val) => val == 0,
  "sar_stop": (val) => false, // 	functional 	-
  "sar_toast_create": (val) => true, // 	non-functional 	-
  "sar_check_update": (val) => true, // 	non-functional 	-
  "sar_update": (val) => false, // 	non-functional 	-
  "svar_abs": (val) => true,
  "svar_add": (val) => true,
  "svar_capture": (val) => true,
  "svar_ceil": (val) => true,
  "svar_count": (val) => true,
  "svar_div": (val) => true,
  "svar_fadd": (val) => true,
  "svar_fdiv": (val) => true,
  "svar_floor": (val) => true,
  "svar_fmod": (val) => true,
  "svar_fmul": (val) => true,
  "svar_from_cvar": (val) => true,
  "svar_fsub": (val) => true,
  "svar_get": (val) => true,
  "svar_mod": (val) => true,
  "svar_mul": (val) => true,
  "svar_no_persist": (val) => true,
  "svar_persist": (val) => true,
  "svar_round": (val) => true,
  "svar_set": (val) => true,
  "svar_sub": (val) => true,
  "svar_substr": (val) => true,
  "sar_aircontrol": (val) => false, // 	banned 	-
  "sar_autojump": (val) => false, // 	banned 	-
  "sar_autorecord": (val) => val == -1, // 	non-functional 	-
  "nop": (val) => true, // 	non-functional 	-
  "sar_about": (val) => true, // 	non-functional 	-
  "sar_achievement_tracker_ignore_coop": (val) => true,
  "sar_achievement_tracker_reset": (val) => true,
  "sar_achievement_tracker_show": (val) => true,
  "sar_achievement_tracker_status": (val) => true,
  "sar_allow_resizing_window": (val) => true, // 	non-functional 	-
  "sar_always_transmit_heavy_ents": (val) => true, // 	non-functional 	-
  "sar_avg_result": (val) => true,
  "sar_avg_start": (val) => true,
  "sar_avg_stop": (val) => true,
  "sar_bink_respect_host_time": (val) => true, // 	non-functional 	-
  "sar_challenge_autostop": (val) => true, // 	non-functional 	-
  "sar_challenge_autosubmit_reload_api_key": (val) => true, // 	non-functional 	-
  "sar_chat": (val) => true, // 	non-functional 	-
  "sar_cheat_hud_x": (val) => true, // 	non-functional 	-
  "sar_cheat_hud_y": (val) => true, // 	non-functional 	-
  "sar_clear_lines": (val) => true, // 	non-functional 	-
  "sar_cm_rightwarp": (val) => val == 1, // 	non-functional 	-
  "sar_con_filter_allow": (val) => true,
  "sar_con_filter_block": (val) => true,
  "sar_con_filter_default": (val) => true,
  "sar_con_filter_reset": (val) => true,
  "sar_con_filter_suppress_blank_lines": (val) => true,
  "sar_coop_reset_progress": (val) => true, // 	banned 	-
  "sar_cps_add": (val) => true,
  "sar_cps_clear": (val) => true,
  "sar_cps_result": (val) => true,
  "sar_cvarlist": (val) => true, // 	non-functional 	-
  "sar_delete_alias_cmds": (val) => true, // 	non-functional 	-
  "sar_demo_blacklist_addcmd": (val) => true, // 	non-functional 	-
  "sar_demo_blacklist_all": (val) => true, // 	non-functional 	-
  "sar_demo_overwrite_bak": (val) => true, // 	non-functional 	-
  "sar_demo_portal_interp_fix": (val) => true, // 	non-functional 	-
  "sar_demo_remove_broken": (val) => true, // 	non-functional 	-
  "sar_disable_challenge_stats_hud": (val) => true, // 	non-functional 	-
  "sar_disable_coop_score_hud": (val) => true, // 	non-functional 	-
  "sar_disable_no_focus_sleep": (val) => true, // 	non-functional 	-
  "sar_disable_progress_bar_update": (val) => true, // 	non-functional 	-
  "sar_disable_save_status_hud": (val) => true, // 	non-functional 	-
  "sar_disable_steam_pause": (val) => true, // 	non-functional 	-
  "sar_disable_weapon_sway": (val) => true, // 	non-functional 	-
  "sar_dpi_scale": (val) => true, // 	functional 	-
  "sar_echo": (val) => true, // 	non-functional 	-
  "sar_echo_nolf": (val) => true, // 	non-functional 	-
  "sar_exit": (val) => true, // 	functional 	-
  "sar_export_stats": (val) => true, // 	non-functional 	-
  "sar_import_stats": (val) => true, // 	non-functional 	-
  "sar_fast_load_preset": (val) => true, // 	non-functional 	-
  "sar_fix_reloaded_cheats": (val) => true, // 	non-functional 	-
  "sar_font_": (val) => true, // 	non-functional 	-
  "sar_groundframes_": (val) => true, // 	non-functional 	-
  "sar_hud_velocity_precision": (val) => val >= 0 && val <= 2, // 	functional 	0 .. 2
  "sar_hud_precision": (val) => val >= 0 && val <= 6, // 	functional 	0 .. 6
  "sar_hud_angles": (val) => true,
  "sar_hud_avg": (val) => true,
  "sar_hud_bg": (val) => true,
  "sar_hud_cps": (val) => true,
  "sar_hud_demo": (val) => true,
  "sar_hud_duckstate": (val) => true,
  "sar_hud_ent_slot_serial": (val) => true,
  "sar_hud_eyeoffset": (val) => true,
  "sar_hud_font_color": (val) => true,
  "sar_hud_font_index": (val) => true,
  "sar_hud_fps": (val) => true,
  "sar_hud_frame": (val) => true,
  "sar_hud_ghost_spec": (val) => true,
  "sar_hud_grounded": (val) => true,
  "sar_hud_groundframes": (val) => true,
  "sar_hud_groundspeed": (val) => true,
  "sar_hud_hide_text": (val) => true,
  "sar_hud_inspection": (val) => true,
  "sar_hud_jump": (val) => true,
  "sar_hud_jump_peak": (val) => true,
  "sar_hud_jumps": (val) => true,
  "sar_hud_last_frame": (val) => true,
  "sar_hud_last_session": (val) => true,
  "sar_hud_orange_only": (val) => true,
  "sar_hud_order_bottom": (val) => true,
  "sar_hud_order_reset": (val) => true,
  "sar_hud_order_top": (val) => true,
  "sar_hud_pause_timer": (val) => true,
  "sar_hud_portal_angles": (val) => true,
  "sar_hud_portal_angles_2": (val) => true,
  "sar_hud_portals": (val) => true,
  "sar_hud_position": (val) => true,
  "sar_hud_rainbow": (val) => true,
  "sar_hud_session": (val) => true,
  "sar_hud_set_text": (val) => true,
  "sar_hud_set_text_color": (val) => true,
  "sar_hud_show_text": (val) => true,
  "sar_hud_spacing": (val) => true,
  "sar_hud_steps": (val) => true,
  "sar_hud_strafesync_color": (val) => true,
  "sar_hud_strafesync_font_index": (val) => true,
  "sar_hud_strafesync_offset_x": (val) => true,
  "sar_hud_strafesync_offset_y": (val) => true,
  "sar_hud_strafesync_split_offset_y": (val) => true,
  "sar_hud_sum": (val) => true,
  "sar_hud_tastick": (val) => true,
  "sar_hud_tbeam": (val) => true,
  "sar_hud_tbeam_count": (val) => true,
  "sar_hud_text": (val) => true,
  "sar_hud_timer": (val) => true,
  "sar_hud_toggle_text": (val) => true,
  "sar_hud_trace": (val) => true,
  "sar_hud_velang": (val) => true,
  "sar_hud_velocity": (val) => true,
  "sar_hud_velocity_peak": (val) => true,
  "sar_hud_x": (val) => true,
  "sar_hud_y": (val) => true,
  "sar_ihud_add_key": (val) => true,
  "sar_ihud_analog_image_scale": (val) => true,
  "sar_ihud_analog_view_deshake": (val) => true,
  "sar_ihud_clear_background": (val) => true,
  "sar_ihud_grid_padding": (val) => true,
  "sar_ihud_grid_size": (val) => true,
  "sar_ihud_modify": (val) => true,
  "sar_ihud_preset": (val) => true,
  "sar_ihud_set_background": (val) => true,
  "sar_ihud_setpos": (val) => true,
  "sar_ihud_x": (val) => true,
  "sar_ihud_y": (val) => true,
  "sar_load_delay": (val) => true, // 	non-functional 	-
  "sar_loads_norender": (val) => true, // 	non-functional 	-
  "sar_loads_uncap": (val) => true, // 	non-functional 	-
  "sar_lphud_font": (val) => true,
  "sar_lphud_reset": (val) => true,
  "sar_lphud_reset_on_changelevel": (val) => true,
  "sar_lphud_set": (val) => true,
  "sar_lphud_setpos": (val) => true,
  "sar_lphud_x": (val) => true,
  "sar_lphud_y": (val) => true,
  "sar_minimap_load": (val) => true,
  "sar_minimap_max_height": (val) => true,
  "sar_minimap_max_width": (val) => true,
  "sar_minimap_player_color": (val) => true,
  "sar_minimap_x": (val) => true,
  "sar_minimap_y": (val) => true,
  "sar_mtrigger_legacy_format": (val) => true, // 	non-functional 	-
  "sar_mtrigger_legacy_textcolor": (val) => true, // 	non-functional 	-
  "sar_pip_align": (val) => true, // 	non-functional 	-
  "sar_prevent_ehm": (val) => true, // 	non-functional 	-
  "sar_prevent_mat_snapshot_recompute": (val) => true, // 	non-functional 	-
  "sar_print_stats": (val) => true, // 	non-functional 	-
  "sar_record_at": (val) => val == 0,
  "sar_record_at_demo_name": (val) => true,
  "sar_record_at_increment": (val) => true,
  "sar_record_mkdir": (val) => true, // 	non-functional 	-
  "sar_record_prefix": (val) => true, // 	non-functional 	-
  "sar_rename": (val) => true, // 	non-functional 	-
  "sar_scrollspeed": (val) => true, // 	non-functional 	-
  "sar_session": (val) => true, // 	non-functional 	-
  "sar_sr_hud_x": (val) => true, // 	non-functional 	-
  "sar_sr_hud_y": (val) => true, // 	non-functional 	-
  "sar_sr_hud_font_color": (val) => true, // 	non-functional 	-
  "sar_sr_hud_font_index": (val) => true, // 	non-functional 	-
  "sar_statcounter_filepath": (val) => true, // 	non-functional 	-
  "sar_stats_auto_reset": (val) => true,
  "sar_stats_jump": (val) => true,
  "sar_stats_jumps_reset": (val) => true,
  "sar_stats_jumps_xy": (val) => true,
  "sar_stats_reset": (val) => true,
  "sar_stats_steps": (val) => true,
  "sar_stats_steps_reset": (val) => true,
  "sar_stats_velocity": (val) => true,
  "sar_stats_velocity_peak_xy": (val) => true,
  "sar_stats_velocity_reset": (val) => true,
  "sar_strafe_quality_width": (val) => true, // 	non-functional 	-
  "sar_strafe_quality_height": (val) => true, // 	non-functional 	-
  "sar_strafe_quality_ticks": (val) => true, // 	non-functional 	-
  "sar_strafesync_noground": (val) => true,
  "sar_strafesync_pause": (val) => true,
  "sar_strafesync_reset": (val) => true,
  "sar_strafesync_resume": (val) => true,
  "sar_strafesync_session_time": (val) => true,
  "sar_strafesync_split": (val) => true,
  "sar_sum_during_session": (val) => true, // 	non-functional 	-
  "sar_sum_here": (val) => true, // 	non-functional 	-
  "sar_sum_result": (val) => true, // 	non-functional 	-
  "sar_sum_stop": (val) => true, // 	non-functional 	-
  "sar_teleport_setpos": (val) => true, // 	non-functional 	-
  "sar_timer_always_running": (val) => true,
  "sar_timer_result": (val) => true,
  "sar_timer_start": (val) => true,
  "sar_timer_stop": (val) => true,
  "sar_timer_time_pauses": (val) => true,
  "sar_toast_align": (val) => true,
  "sar_toast_anchor": (val) => true,
  "sar_toast_background": (val) => true,
  "sar_toast_compact": (val) => true,
  "sar_toast_disable": (val) => true,
  "sar_toast_dismiss_all": (val) => true,
  "sar_toast_font": (val) => true,
  "sar_toast_net_create": (val) => true,
  "sar_toast_net_disable": (val) => true,
  "sar_toast_setpos": (val) => true,
  "sar_toast_tag_dismiss_all": (val) => true,
  "sar_toast_tag_set_color": (val) => true,
  "sar_toast_tag_set_duration": (val) => true,
  "sar_toast_width": (val) => true,
  "sar_toast_x": (val) => true,
  "sar_toast_y": (val) => true,
  "sar_velocitygraph_": (val) => true, // 	non-functional 	-
  "sar_alias": (val) => true, // 	non-functional 	-
  "sar_function": (val) => true, // 	non-functional 	-
  "sar_expand": (val) => true, // 	inherited 	-
  "cond": (val) => true, // 	inherited 	-
  "conds": (val) => true, // 	inherited 	-
  "sar_alias_run": (val) => true, // 	inherited 	-
  "sar_function_run": (val) => true, // 	inherited 	-
  "sar_on_config_exec": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_config_exec_clear": (val) => true,
  "sar_on_config_exec_list": (val) => true,
  "sar_on_coop_reset_done": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_coop_reset_done_clear": (val) => true,
  "sar_on_coop_reset_done_list": (val) => true,
  "sar_on_coop_reset_remote": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_coop_reset_remote_clear": (val) => true,
  "sar_on_coop_reset_remote_list": (val) => true,
  "sar_on_coop_spawn": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_coop_spawn_clear": (val) => true,
  "sar_on_coop_spawn_list": (val) => true,
  "sar_on_demo_start": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_demo_start_clear": (val) => true,
  "sar_on_demo_start_list": (val) => true,
  "sar_on_demo_stop": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_demo_stop_clear": (val) => true,
  "sar_on_demo_stop_list": (val) => true,
  "sar_on_exit": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_exit_clear": (val) => true,
  "sar_on_exit_list": (val) => true,
  "sar_on_flags": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_flags_clear": (val) => true,
  "sar_on_flags_list": (val) => true,
  "sar_on_load": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_load_clear": (val) => true,
  "sar_on_load_list": (val) => true,
  "sar_on_not_pb": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_not_pb_clear": (val) => true,
  "sar_on_not_pb_list": (val) => true,
  "sar_on_pb": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_pb_clear": (val) => true,
  "sar_on_pb_list": (val) => true,
  "sar_on_session_end": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_session_end_clear": (val) => true,
  "sar_on_session_end_list": (val) => true,
  "sar_on_tas_end": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_tas_end_clear": (val) => true,
  "sar_on_tas_end_list": (val) => true,
  "sar_on_tas_start": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "sar_on_tas_start_clear": (val) => true,
  "sar_on_tas_start_list": (val) => true,
  "hwait": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "seq": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "wait": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "wait_to": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "wait_for": (val) => !val.includes("+") && !val.includes("-") && cvarTestSafe[val.split(" ")[0]](val.split(" ").slice(1).join(" ")),
  "wait_mode": (val) => true, // 	non-functional 	-
  "wait_persist_across_loads": (val) => true, // 	non-functional 	-
  // miscellaneous commands found in demos
  "gl_can_query_fast": (val) => true,
  "sdl_displayindex_fullscreen": (val) => true,
  "sdl_displayindex": (val) => true,
  "cl_ragdoll_self_collision": (val) => true,
  "sv_hosting_lobby": (val) => true,
  "steamworks_sessionid_server": (val) => true,
  "sv_portal_players": (val) => val == 2,
  "cl_session": (val) => true,
  "steamworks_sessionid_client": (val) => true,
  "portal_tauntcam_yaw": (val) => true,
  "portal_tauntcam_pitch": (val) => true,
  "cm_max_history_chambers": (val) => true,
  "cm_current_community_map": (val) => true,
  "ui_pvplobby_show_offline": (val) => true,
  "joy_remap_player_for_controller1": (val) => true,
  "mm_session_sys_delay_create_host": (val) => true
};

const cvarTestIllegal = {
  "noclip": (val, cheats) => cheats,
  "notarget": (val, cheats) => cheats,
  "ent_fire": (val) => true,
  "god": (val, cheats) => cheats,
  "buddha": (val, cheats) => cheats,
  "sv_portal_placement_never_fail": (val) => val != 0,
  "sar_aircontrol": (val) => true,
  "sar_autojump": (val, cheats) => cheats,
  "sar_duckjump": (val) => true,
  "cl_ent_absbox": (val) => true,
  "cl_ent_bbox": (val) => true,
  "cl_ent_rbox": (val) => true,
  "cl_find_ent": (val) => true,
  "cl_find_ent_index": (val) => true,
  "cl_showents": (val) => true,
  "ent_absbox": (val) => true,
  "ent_attachments": (val) => true,
  "ent_autoaim": (val) => true,
  "ent_bbox": (val) => true,
  "ent_cancelpendingentfires": (val) => true,
  "ent_create": (val) => true,
  "ent_create_paint_bomb_erase": (val) => true,
  "ent_create_paint_bomb_jump": (val) => true,
  "ent_create_paint_bomb_portal": (val) => true,
  "ent_create_paint_bomb_speed": (val) => true,
  "ent_create_portal_companion_cube": (val) => true,
  "ent_create_portal_reflector_cube": (val) => true,
  "ent_create_portal_weighted_antique": (val) => true,
  "ent_create_portal_weighted_cube": (val) => true,
  "ent_create_portal_weighted_sphere": (val) => true,
  "ent_debugkeys": (val) => true,
  "ent_dump": (val) => true,
  "ent_info": (val) => true,
  "ent_keyvalue": (val) => true,
  "ent_messages": (val) => true,
  "ent_messages_draw": (val) => true,
  "ent_name": (val) => true,
  "ent_orient": (val) => true,
  "ent_pause": (val) => true,
  "ent_pivot": (val) => true,
  "ent_rbox": (val) => true,
  "ent_remove": (val) => true,
  "ent_remove_all": (val) => true,
  "ent_rotate": (val) => true,
  "ent_script_dump": (val) => true,
  "ent_setang": (val) => true,
  "ent_setname": (val) => true,
  "ent_setpos": (val) => true,
  "ent_show_contexts": (val) => true,
  "ent_show_response_criteria": (val) => true,
  "ent_step": (val) => true,
  "ent_teleport": (val) => true,
  "ent_text": (val) => true,
  "ent_viewoffset": (val) => true,
  "find_ent": (val) => true,
  "find_ent_index": (val) => true,
  "fire_rocket_projectile": (val) => true,
  "getpos": (val) => true,
  "getpos_exact": (val) => true,
  "hurtme": (val) => true,
  "impulse": (val) => true,
  "npc_bipass": (val) => true,
  "npc_combat": (val) => true,
  "npc_conditions": (val) => true,
  "npc_create": (val) => true,
  "npc_create_aimed": (val) => true,
  "npc_create_equipment": (val) => true,
  "npc_destroy": (val) => true,
  "npc_destroy_unselected": (val) => true,
  "npc_enemies": (val) => true,
  "npc_focus": (val) => true,
  "npc_freeze": (val) => true,
  "npc_freeze_unselected": (val) => true,
  "npc_go": (val) => true,
  "npc_go_do_run": (val) => true,
  "npc_go_random": (val) => true,
  "npc_heal": (val) => true,
  "npc_height_adjust": (val) => true,
  "npc_kill": (val) => true,
  "npc_nearest": (val) => true,
  "npc_relationships": (val) => true,
  "npc_reset": (val) => true,
  "npc_route": (val) => true,
  "npc_select": (val) => true,
  "npc_sentences": (val) => true,
  "npc_set_freeze": (val) => true,
  "npc_set_freeze_unselected": (val) => true,
  "npc_speakall": (val) => true,
  "npc_squads": (val) => true,
  "npc_steering": (val) => true,
  "npc_steering_all": (val) => true,
  "npc_task_text": (val) => true,
  "npc_tasks": (val) => true,
  "npc_teleport": (val) => true,
  "npc_thinknow": (val) => true,
  "npc_viewcone": (val) => true,
  "npc_vphysics": (val) => true,
  "picker": (val) => true,
  "plugin_load": (val) => true,
  "plugin_pause": (val) => true,
  "plugin_pause_all": (val) => true,
  "plugin_print": (val) => true,
  "plugin_unload": (val) => true,
  "plugin_unpause": (val) => true,
  "plugin_unpause_all": (val) => true,
  "portal_place": (val) => true,
  "portal_report": (val) => true,
  "portals_resizeall": (val) => true,
  "prop_crosshair": (val) => true,
  "prop_debug": (val) => true,
  "prop_dynamic_create": (val) => true,
  "prop_physics_create": (val) => true,
  "report_entities": (val) => true,
  "respawn_entities": (val) => true,
  "script": (val) => (val !== "::coopUpdatePortals()"),
  "script_client": (val) => true,
  "script_execute": (val) => true,
  "script_execute_client": (val) => true,
  "setang": (val) => true,
  "setang_exact": (val) => true,
  "setinfo": (val) => true,
  "setpos": (val) => true,
  "setpos_exact": (val) => true,
  "setpos_player": (val) => true,
  "showtriggers_toggle": (val) => true,
  "snapto": (val) => true,
  "test_createentity": (val) => true,
  "test_dispatcheffect": (val) => true,
  "test_ehandle": (val) => true,
  "toolload": (val) => true,
  "toolunload": (val) => true,
  "cl_cmdrate": (val) => true,
  "host_timescale": (val) => true,
  "give": (val) => val != "weapon_portalgun"
};

/**
 * Handles the `testcvar` utility command. This utility is used to determine if a given cvar is safe to use in a run.
 *
 * The cvar is specified in `args[0]`, the value in `args[1]`, and the value of `sv_cheats` in `args[2]`.
 */
module.exports = async function (args, context = epochtal) {

  const [cvar, value, sv_cheats] = args;

  const cleanCvar = cvar.trim().toLowerCase();

  if (cleanCvar in cvarTestIllegal && cvarTestIllegal[cleanCvar](value, sv_cheats)) return VERDICT_ILLEGAL;
  if (cleanCvar in cvarTestSafe && cvarTestSafe[cleanCvar](value, sv_cheats)) return VERDICT_SAFE;

  return VERDICT_UNSURE;

};
