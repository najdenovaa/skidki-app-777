import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Callout, Marker, type Region } from "react-native-maps";

import Colors from "@/constants/colors";
import type { Station } from "@/types/queue";

interface Props {
  stations: Station[];
  onMarkerPress: (station: Station) => void;
  userLat?: number;
  userLng?: number;
}

function pinColor(station: Station): string {
  if (station.status !== "active") return Colors.textMuted;
  if (station.queueCount <= 5) return Colors.success;
  if (station.queueCount <= 15) return Colors.warning;
  return Colors.danger;
}

export function StationMap({ stations, onMarkerPress, userLat, userLng }: Props) {
  const initialRegion = useMemo<Region>(() => {
    if (userLat !== undefined && userLng !== undefined) {
      return {
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (stations.length > 0) {
      return {
        latitude: stations[0].lat,
        longitude: stations[0].lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return {
      latitude: 55.7558,
      longitude: 37.6173,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [userLat, userLng, stations]);

  return (
    <MapView style={styles.map} initialRegion={initialRegion} showsUserLocation showsMyLocationButton>
      {stations.map((station) => (
        <Marker
          key={station.id}
          coordinate={{ latitude: station.lat, longitude: station.lng }}
          pinColor={pinColor(station)}
          onPress={() => onMarkerPress(station)}
        >
          <Callout onPress={() => onMarkerPress(station)}>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{station.name}</Text>
              <Text style={styles.calloutSubtitle}>{station.queueCount} в очереди</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  callout: {
    minWidth: 140,
    paddingVertical: 2,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
