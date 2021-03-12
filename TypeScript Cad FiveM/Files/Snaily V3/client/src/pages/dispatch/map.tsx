import React, { Component } from "react";
import L from "leaflet";
import J from "jquery";
import "leaflet.markercluster";
import { v4 as uuid } from "uuid";
import { Socket } from "socket.io-client";
import "../../styles/map.css";
import Logger from "../../lib/Logger";
import CADSocket from "../../lib/socket";
import {
  Player,
  DataActions,
  MarkerPayload,
  CustomMarker,
  LatLng,
  defaultTypes,
  Blip,
  BLIP_SIZES,
  IIcon,
  IPopup,
} from "../../components/dispatch/map/interfaces";
import {
  getMapBounds,
  convertToMap,
  stringCoordToFloat,
  createCluster,
} from "../../components/dispatch/map/functions";
import ActiveMapCalls from "../../components/dispatch/map.ActiveCalls";
import ActiveMapUnits from "../../components/dispatch/map.ActiveUnits";
import Create911Call from "../../components/modals/call911Modal";
import { connect } from "react-redux";
import { getActiveUnits } from "../../lib/actions/dispatch";
import State from "../../interfaces/State";
import CadInfo from "../../interfaces/CadInfo";
import Call from "../../interfaces/Call";
import { update911Call } from "../../lib/actions/911-calls";
import { CallInfoHTML, PlayerInfoHTML, BlipInfoHTML } from "../../components/dispatch/map/html";
import User from "../../interfaces/User";
import { getMembers } from "../../lib/actions/admin";
import blipTypes from "../../components/dispatch/map/blips";
/* MOST CODE IN THIS FILE IS FROM TGRHavoc/live_map-interface, SPECIAL THANKS TO HIM FOR MAKING THIS! */

/* 
 ? Search for:
 * REMOVE_CALL_FROM_MAP
 * CREATE_CALL_MARKER
 * UPDATE_CALL_POSITION
 * REMOVE_911_CALL_FROM_MAP
*/

const TILES_URL = "/tiles/minimap_sea_{y}_{x}.png";

interface Props {
  cadInfo: CadInfo | null;
  calls: Call[];
  user: User | null;
  members: User[];
  getActiveUnits: () => void;
  getMembers: () => void;
  update911Call: (id: string, data: Partial<Call>) => void;
}

interface MapState {
  MarkerStore: CustomMarker[];
  MarkerTypes: Record<number, IIcon>;
  PopupStore: IPopup[];
  blips: Blip[][];
  PlayerMarkers: L.Layer;
  map: L.Map | null;
  ran: boolean;
  blipsShown: boolean;
  showAllPlayers: boolean;
}

class MapClass extends Component<Props, MapState> {
  CADSocket: Socket | null;
  MAPSocket: WebSocket | null;

  constructor(props: Props) {
    super(props);

    this.state = {
      MarkerStore: [],
      MarkerTypes: defaultTypes,
      PopupStore: [],
      blips: [[]],
      PlayerMarkers: createCluster(),
      map: null,
      ran: false,
      blipsShown: true,
      showAllPlayers: false,
    };

    this.CADSocket = null;
    this.MAPSocket = null;
  }

  handleMapSocket() {
    const live_map_url = this.props.cadInfo?.live_map_url;
    if (!live_map_url) {
      Logger.error("LIVE_MAP", "There was no live_map_url provided from the CAD_SETTINGS");
      return;
    }
    if (!live_map_url.startsWith("ws")) {
      Logger.error(
        "LIVE_MAP",
        "The live_map_url did not start with ws. Make sure it is a WebSocket protocol",
      );
      return;
    }

    this.MAPSocket = new WebSocket(`${live_map_url}`);
  }

  handleCADSocket() {
    this.CADSocket = CADSocket;
  }

  initMap() {
    if (this.state.ran) return;

    this.setState({
      ran: true,
    });

    const TileLayer = L.tileLayer(TILES_URL, {
      minZoom: -2,
      maxZoom: 2,
      tileSize: 1024,
      maxNativeZoom: 0,
      minNativeZoom: 0,
    });

    const map = L.map("map", {
      crs: L.CRS.Simple,
      layers: [TileLayer],
      zoomControl: false,
    }).setView([0, 0], 0);

    const bounds = getMapBounds(map);

    map.setMaxBounds(bounds);
    map.fitBounds(bounds);
    map.addLayer(this.state.PlayerMarkers);

    this.setState({
      map: map,
    });
  }

  showBlips() {
    for (const id in this.state.blips) {
      const blipArr: Blip[] = this.state.blips[id];

      blipArr.forEach((blip) => {
        const marker = this.state.MarkerStore?.[blip.markerId];

        marker?.addTo(this.state.map!);
      });
    }
  }

  blipSuccess(data: any) {
    for (const id in data) {
      if (data?.[id]) {
        const blipArray = data[id];

        for (const i in blipArray) {
          const blip = blipArray[i];
          const fallbackName = `${id} | ${this.state?.MarkerTypes?.[+id]?.name}` || id;

          blip.name = blip?.name || fallbackName;
          blip.description = blip?.description || "N/A";

          blip.type = id;
          this.createBlip(blip);
        }
      }
    }
  }

  toggleBlips(show: boolean) {
    this.setState({
      MarkerStore: this.state.MarkerStore.map((marker) => {
        if (marker.payload.isBlip) {
          if (show) {
            marker.addTo(this.state.map!);
          } else {
            marker.remove();
            marker.removeFrom(this.state.map!);
          }
        }

        return marker;
      }),
    });
  }

  createMarker(draggable: boolean, payload: MarkerPayload, title: string) {
    if (this.state.map === null) return;
    let newPos: LatLng;
    if (!payload.pos) return;

    if ("lat" in payload.pos) {
      newPos = {
        lat: payload.pos.lat,
        lng: payload.pos.lng,
      };
    } else {
      const coords = stringCoordToFloat(payload.pos);
      const converted = convertToMap(coords.x, coords.y, this.state.map);
      if (!converted) return;

      newPos = converted;
    }

    const converted = newPos;
    const infoContent =
      (payload.player && PlayerInfoHTML(payload.player)) ||
      (payload.call && CallInfoHTML(payload.call)) ||
      BlipInfoHTML(payload);
    const where = payload.player ? this.state.PlayerMarkers : this.state.map;

    const marker: CustomMarker = (L as any)
      .marker(converted, {
        title,
        draggable,
      })
      .addTo(where)
      .bindPopup(infoContent);

    if (payload.icon !== null && payload.icon?.iconUrl) {
      const img = L.icon(payload.icon);
      marker.setIcon(img);
    }

    marker.payload = payload;

    this.setState({
      MarkerStore: [...this.state.MarkerStore, marker],
    });

    return marker;
  }

  createBlip(blip: Blip) {
    if (!blip.pos) {
      if (!blip?.pos) {
        blip.pos = {
          x: blip.x,
          y: blip.y,
          z: blip.z,
        };

        delete blip.x;
        delete blip.y;
        delete blip.z;
      }
    }

    const obj: MarkerPayload = {
      title: blip.name,
      pos: blip.pos,
      description: blip.description,
      icon: this.state.MarkerTypes?.[blip.type],
      id: uuid(),
      isBlip: true,
    };

    if (!this.state.blips[blip.type]) {
      this.setState((prev) => {
        return {
          ...prev,
          blips: (prev.blips[blip.type] = []),
        };
      });
    }

    const marker = this.createMarker(false, obj, blip.name);
    if (!marker) return;

    const blips = this.state.blips;
    blips[blip.type].push(blip);

    this.setState({
      blips: blips,
    });
  }

  async initBlips() {
    const nameToId: any = {};
    let blipCss = "";

    const generateBlips = () => {
      blipCss = `.blip {
        background: url("/map/blips_texturesheet.png");
        background-size: ${1024 / 2}px ${1024 / 2}px;
        display: inline-block;
        width: ${BLIP_SIZES.width}px;
        height: ${BLIP_SIZES.height}px;
      }`;

      const current = {
        x: 0,
        y: 0,
        id: 0,
      };

      for (const blipName in blipTypes) {
        const blip = blipTypes[blipName];

        if (!blip.id) {
          current.id = current.id + 1;
        } else {
          current.id = blip.id;
        }

        if (!blip.x) {
          current.x += 1;
        } else {
          current.x = blip.x;
        }

        if (blip.y) {
          current.y = blip.y;
        }

        const MarkerTypes = this.state.MarkerTypes;

        MarkerTypes[current.id] = {
          name: blipName.replace(/([A-Z0-9])/g, " $1").trim(),
          className: `blip blip-${blipName}`,
          iconUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAFElEQVR4XgXAAQ0AAABAMP1L30IDCPwC/o5WcS4AAAAASUVORK5CYII=",
          iconSize: [BLIP_SIZES.width, BLIP_SIZES.height],
          iconAnchor: [BLIP_SIZES.width / 2, 0],
          popupAnchor: [0, 0],
        };

        this.setState({
          MarkerTypes,
        });

        nameToId[blipName] = current.id;

        const left = current.x * BLIP_SIZES.width + 0;
        const top = current.y * BLIP_SIZES.height + 0;

        blipCss += `.blip-${blipName} { background-position: -${left}px -${top}px }`;
      }

      J("head").append(`<style>${blipCss}</style>`);
      setTimeout(generateBlipControls, 50);

      this.showBlips();
    };

    const generateBlipControls = () => {
      for (const blipName in blipTypes) {
        J("#blip-control-container").append(
          `<a data-blip-number="${nameToId[blipName]}" id="blip_${blipName}_link" class="blip-button-a list-group-item d-inline-block collapsed blip-enabled" href="#"><span class="blip blip-${blipName}"></span></a>`,
        );
      }

      J(".blip-button-a").on("click", (e) => {
        const element = $(e.currentTarget);

        // Toggle blip
        element.addClass("blip-enabled");

        this.showBlips();
      });
    };

    const blipSuccess = async (data: any) => {
      for (const id in data) {
        if (data?.[id]) {
          const blipArray = data[id];

          for (const i in blipArray) {
            const blip = blipArray[i];
            const fallbackName = `${id} | ${this.state.MarkerTypes?.[+id]?.name}` || id;

            blip.name = blip?.name || fallbackName;
            blip.description = blip?.description || "N/A";

            blip.type = id;
            createBlip(blip);
          }
        }
      }
    };

    const createBlip = (blip: Blip) => {
      if (!blip.pos) {
        if (!blip?.pos) {
          blip.pos = {
            x: blip.x,
            y: blip.y,
            z: blip.z,
          };

          delete blip.x;
          delete blip.y;
          delete blip.z;
        }
      }

      const obj: MarkerPayload = {
        title: blip.name,
        pos: blip.pos,
        description: blip.description,
        icon: this.state.MarkerTypes?.[blip.type] ?? null,
        id: uuid(),
        isBlip: true,
      };

      if (!this.state.blips?.[blip.type]) {
        this.setState((prev) => {
          prev.blips[blip.type] = [];

          return prev;
        });
      }

      const marker = this.createMarker(false, obj, blip.name);
      if (!marker) return;

      this.setState((prev) => {
        prev.blips[blip.type].push(blip);

        return prev;
      });
    };

    generateBlips();

    J.ajax("/blips.json", {
      success: blipSuccess,
      dataType: "json",
    });
  }

  remove911Call(id: string) {
    this.setState((prev) => {
      const marker = prev.MarkerStore.find((m) => m.payload.call?.id === id);
      marker?.remove();
      marker?.removeFrom(this.state.map!);

      return {
        ...prev,
        MarkerStore: prev.MarkerStore.filter((marker) => {
          if (marker.payload.call) {
            return marker.payload.call.id !== id;
          } else {
            return true;
          }
        }),
      };
    });
  }

  async handleCalls() {
    if (!this.state.map) return;
    await new Promise((resolve) => setTimeout(resolve, 500));

    this.props.calls.forEach((call) => {
      //? REMOVE_CALL_FROM_MAP
      const m = this.state.MarkerStore.some((marker) => marker.payload?.call?.id === call.id);

      if (m) return;
      if (call.hidden === "1") return;

      //? CREATE_CALL_MARKER
      const marker = this.createMarker(
        true,
        {
          icon: null,
          description: `911 Call from: ${call.name}`,
          id: uuid(),
          pos: call.pos,
          isPlayer: false,
          title: "911 Call",
          call,
        },
        call.location,
      );
      if (!marker) return;

      //? UPDATE_CALL_POSITION
      marker.on("moveend", async (e) => {
        const target = e.target;
        const latLng: LatLng = (target as any)._latlng;

        // Send data to in-game to create blip on map
        // TODO: convert latLng back to x, y,z
        // socket?.send(
        //   JSON.stringify({
        //     type: "update911Call",
        //     call: call,
        //   }),
        // );

        this.props.update911Call(call.id, {
          ...call,
          pos: latLng,
        });
      });
    });
  }

  async onMessage(e: any) {
    const data = JSON.parse(e.data) as DataActions;

    switch (data.type) {
      case "playerLeft": {
        const marker = this.state.MarkerStore.find((marker) => {
          return marker.payload.player?.identifier === data.payload;
        });

        this.setState((prev) => {
          return {
            ...prev,
            MarkerStore: prev.MarkerStore.filter((marker) => {
              return marker.payload.player?.identifier !== data.payload;
            }),
          };
        });

        marker?.removeFrom(this.state.map!);
        break;
      }
      case "playerData": {
        data.payload.forEach((player: Player) => {
          if (!player.identifier) return;
          if (!player.name) return;

          const marker = this.state.MarkerStore.find((marker) => {
            return marker.payload?.player?.identifier === player.identifier;
          });

          let member: User | null | undefined = null;
          if (!this.state.showAllPlayers) {
            member = this.props.members.find((m) => `steam:${m.steam_id}` === player?.identifier);
            if (!member) return;
            if (member.leo === "0" || member.ems_fd === "0") return;
          }

          player.ems_fd = member?.ems_fd === "1";
          player.leo = member?.leo === "1";

          const html = PlayerInfoHTML(player);

          if (marker) {
            const coords = stringCoordToFloat(player.pos);
            const converted = convertToMap(coords.x, coords.y, this.state.map!);
            if (!converted) return;

            marker.setLatLng(converted);

            const popup = this.state.PopupStore.find((popup) => {
              // @ts-expect-error this works!
              return popup.options.identifier === player.identifier;
            });

            popup?.setContent(html);
            marker.setIcon(L.icon(this.state.MarkerTypes[Number(player.icon)]));

            if (popup?.isOpen()) {
              if (popup.getLatLng()?.distanceTo(marker.getLatLng()) !== 0) {
                popup.setLatLng(marker.getLatLng());
              }
            }
          } else {
            const marker = this.createMarker(
              false,
              {
                icon: this.state.MarkerTypes?.[Number(player.icon)],
                description: "Hello world",
                pos: player.pos,
                title: player.name,
                isPlayer: true,
                player: player,
                id: uuid(),
              },
              player?.name,
            );

            if (!marker) {
              return console.error("CANNOT_FIND_MARKER");
            }
            marker?.unbindPopup();

            const popup = L.popup({
              // @ts-expect-error this works!
              identifier: player.identifier,
            })
              .setContent(html)
              .setLatLng(marker.getLatLng());

            this.setState((prev) => {
              return {
                ...prev,
                PopupStore: [...prev.PopupStore, popup as IPopup],
              };
            });

            marker.on("click", (e) => {
              this.state.map?.closePopup((this.state.map as any)._popup);
              popup.setLatLng((e as any).latlng);
              this.state.map?.openPopup(popup);
            });
          }
        });
        break;
      }
      default: {
        return;
      }
    }
  }

  componentDidMount() {
    this.handleMapSocket();
    this.handleCADSocket();
    this.initMap();

    // Get all values from backend
    !this.state.ran && this.props.getActiveUnits();
    !this.state.ran && this.props.getMembers();

    this.handleCalls();
    this.initBlips();

    //? REMOVE_911_CALL_FROM_MAP
    this.CADSocket?.on("END_911_CALL", (callId: string) => {
      this.remove911Call(callId);
    });

    if (!this.MAPSocket) return;
    this.MAPSocket.onclose = () => {
      Logger.log("LIVE_MAP", "Disconnected from live-map");
    };

    this.MAPSocket.onerror = (e) => {
      Logger.log("LIVE_MAP", `${JSON.stringify(e)}`);
    };

    this.MAPSocket.onmessage = (e: MessageEvent) => {
      this.onMessage(e);
    };
  }

  componentDidUpdate() {
    if (this.props.calls) {
      this.handleCalls();
    }
  }

  componentWillUnmount() {
    this.state.map?.remove();
    this.MAPSocket?.close();
    this.MAPSocket = null;

    this.setState({
      MarkerStore: [],
      blips: [],
      blipsShown: true,
      MarkerTypes: defaultTypes,
      PopupStore: [],
      map: null,
      ran: false,
    });
  }

  render() {
    return (
      <>
        <div id="map" style={{ zIndex: 1, height: "calc(100vh - 58px)", width: "100vw" }}></div>

        <div className="map-blips-container">
          <button
            onClick={() => {
              this.setState((prev) => ({ ...prev, blipsShown: !prev.blipsShown }));
              this.toggleBlips(!this.state.blipsShown);
            }}
            className="btn btn-primary"
          >
            {this.state.blipsShown ? "Hide blips" : "Show blips"}
          </button>
          <button
            data-bs-toggle="modal"
            data-bs-target="#call911Modal"
            className="btn btn-primary mx-2"
          >
            Create 911 call
          </button>
          {["owner", "admin", "moderator"].includes(`${this.props.user?.rank}`) ? (
            <button
              onClick={() => {
                if (this.state.showAllPlayers === true) {
                  window.location.reload();
                }

                this.setState({
                  showAllPlayers: !this.state.showAllPlayers,
                });
              }}
              className="btn btn-primary"
            >
              {this.state.showAllPlayers ? "Show only LEO/EMS-FD" : "Show all players"}
            </button>
          ) : null}
        </div>

        <Create911Call />
        <div className="map-items-container">
          <ActiveMapUnits />
          <ActiveMapCalls
            hasMarker={(callId: string) => {
              return this.state.MarkerStore.some((m) => m.payload?.call?.id === callId);
            }}
            setMarker={(call: Call, type: "remove" | "place") => {
              const marker = this.state.MarkerStore.some((m) => m.payload.call?.id === call.id);
              if (marker && type === "place") return;

              if (marker && type === "remove") {
                this.remove911Call(call.id);
              }

              this.props.update911Call(call.id, {
                ...call,
                hidden: type === "remove" ? "1" : "0",
              });
            }}
          />
        </div>
      </>
    );
  }
}

const mapToProps = (state: State) => ({
  cadInfo: state.global.cadInfo,
  calls: state.calls.calls_911,
  user: state.auth.user,
  members: state.admin.members,
});

const Memoized = React.memo(MapClass);
export default connect(mapToProps, { getActiveUnits, update911Call, getMembers })(Memoized);
