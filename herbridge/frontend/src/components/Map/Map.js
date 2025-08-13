"use strict";

import React from "react";
import Geocoder from 'react-map-gl-geocoder'
import ImagePin from './ImagePin'
import ReactMapGL, {NavigationControl, Marker, TRANSITION_EVENTS} from "react-map-gl";
import Paper from '@material-ui/core/Paper'
import Pin from './Pin'
import {flatMap} from '../../utils/utils'

export default class extends React.Component {
  containerRef = React.createRef()
  mapboxAccessToken = "pk.eyJ1IjoiaGFyaXNhbWFsIiwiYSI6ImNqazl2ODA0MTBlY2szcW1pcWhvemhzMG8ifQ.P_vJ5xocOJXPDkFp2xsyvg"
  mapboxUri = "mapbox://styles/mapbox/satellite-streets-v10"
  mapRef = React.createRef()
  viewportTimer = null
  viewportTimerDelay = 650

  static defaultProps = {
    onBoundsChanged: (bounds) => {
    },
    onViewportChanged: (viewport) => {
    },
    images: [],
    resources: [],
    selectedResource: null,
  }

  constructor(props) {
    super(props)
    this.state = {
      viewport: props.viewport || {
        width: 100,
        height: 100,
        latitude: 30.2807022,
        longitude: -97.9108343,
        zoom: 11,
      }
    }
  }

  componentDidMount() {
    window.addEventListener("resize", this._resize);
    this._resize();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this._resize);
  }

  handleViewportChangeForNavigationControl = (viewport) => {
    const newViewport = viewport
    this.setState({viewport: newViewport})
    this.queueViewportChangeEvent()
  }

  handleViewportChangeForGeocoder = (viewport) => {
    const newViewport = Object.assign(this.state.viewport, viewport)
    this.setState({
      viewport: Object.assign(newViewport, {
        transitionDuration: 0,
        transitionInterruption: TRANSITION_EVENTS.BREAK,
      })
    })
    this.queueViewportChangeEvent()
  }

  handleViewportChangeForMap = (viewport) => {
    const newViewport = viewport
    this.setState({viewport: newViewport})
    this.queueViewportChangeEvent()
  }

  queueViewportChangeEvent = () => {
    if (this.viewportTimer !== undefined) {
      clearTimeout(this.viewportTimer)
    }
    this.viewportTimer = setTimeout(() => {
      const {viewport} = this.state
      this.props.onViewportChanged(viewport)
      const mapBounds = this.mapRef.current.getMap().getBounds()
      const bounds = flatMap([
        mapBounds.getSouthWest(),
        mapBounds.getNorthWest(),
        mapBounds.getNorthEast(),
        mapBounds.getSouthEast(),
        mapBounds.getSouthWest(),
      ], (latLng) => [[latLng.lng, latLng.lat]])
      this.props.onBoundsChanged({polygon: [bounds]})
      this.viewportTimer = null
    }, this.viewportTimerDelay)
  }

  _resize = () => {
    const {height, width} = this.containerRef.getBoundingClientRect()
    const viewport = Object.assign(this.state.viewport, {height, width})
    this.setState({viewport});
  };


  getOverlays = () => {
    const {images,resources, selectedResource} = this.props
    return (
      <div>
        {resources.map((resource, index) => {
          return (
            <Marker
              longitude={resource.coordinates.longitude}
              latitude={resource.coordinates.latitude}>
              <Pin
                index={index}
                opacity={!selectedResource ? 1 : (resource !== selectedResource ? 0 : 1)}
                selected={resource === selectedResource}
              />
            </Marker>
          )
        })}
        {images.map(image => {
          return (
            <Marker
              longitude={image.longitude}
              latitude={image.latitude}>
              <ImagePin/>
            </Marker>
          )
        })}
      </div>
    )
  }

  render() {
    return (
      <Paper>
        <div
          ref={ref => this.containerRef = ref}
          style={{
            height: 510,
            width: '100%',
          }}>
          <ReactMapGL
            {...this.state.viewport}
            mapboxApiAccessToken={this.mapboxAccessToken}
            mapStyle={this.mapboxUri}
            ref={this.mapRef}
            scrollZoom={false}
            touchZoom={false}
            onViewportChange={this.handleViewportChangeForMap}>
            {this.getOverlays()}
            <Geocoder
              mapboxApiAccessToken={this.mapboxAccessToken}
              mapRef={this.mapRef}
              onViewportChange={this.handleViewportChangeForGeocoder}
            />
            <div style={{
              position: 'absolute',
              right: 10,
              bottom: 10
            }}>
              <NavigationControl onViewportChange={this.handleViewportChangeForNavigationControl}/>
            </div>
          </ReactMapGL>
        </div>
      </Paper>
    );
  }
}
