import React from "react";
import ReactDOM from "react-dom";
import api from '../../lib/api'
import cookies from '../../utils/cookies'
import {hot} from 'react-hot-loader'
import GeoJSON from 'geojson'
import Grow from '@material-ui/core/Grow';
import Grid from '@material-ui/core/Grid'
import Map from '../Map'
import PhotoConfirmation from '../PhotoConfirmation'
import PhotoGridList from '../PhotoGridList'
import TargetResource from '../TargetResource'
import SubmissionBar from '../SubmissionBar'
import Login from '../Login'
import LogoHerBridge from '../Svg/logo-herbridge.svg';
import Svg from 'react-svg-inline'
import MomentUtils from 'material-ui-pickers/utils/moment-utils'
import MuiPickersUtilsProvider from 'material-ui-pickers/utils/MuiPickersUtilsProvider'
import {MuiThemeProvider, createMuiTheme} from '@material-ui/core/styles';
import {imageSectionsFromImages} from '../../lib/image'
import {flatMap} from '../../utils/utils'
import moment from "moment";
import SubmissionSnackbar from "../SubmissionSnackbar"

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#008FED'
    },
    secondary: {
      main: '#f44336',
    },
  },
});

// Main react component for frontend application
class App extends React.Component {
  /* Static variables */
  static MIN_BOTTOM_MARGIN = 32

  /* Instance variables */
  resizeTimer = null


  constructor(props) {
    super(props);
    this.state = {
      bottomMargin: App.MIN_BOTTOM_MARGIN,
      images: [],
      isLoading: false,
      isLoadingImages: false,
      isLoadingResources: false,
      isLoggedIn: false,
      loginError: null,
      loginIsLoading: false,
      selectedPhotoConfirmationIndex: 0,
      selectedPhotoIndexes: [],
      selectedPhotos: [],
      selectedResource: null,
      submitError: null,
      submitted: false,
      photoEndDate: moment().toDate(),
      photoStartDate: moment().subtract(3, "days").toDate(),
      resources: [],
      resourcesFiltered: [],
      resourcesFilterQuery: '',
      viewport: {
        latitude: 36.189329,
        longitude: 44.007897,
        zoom: 5,
      }
    }
  }

  componentDidMount() {
    this.setState({
      isLoggedIn: cookies.isLoggedIn()
    })

    window.addEventListener("resize", this.handleWindowResize)
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.handleWindowResize)
    if (this.resizeTimer !== null) {
      clearTimeout(this.resizeTimer)
    }
  }

  calculateBottomMargin = (photos = this.state.selectedPhotos) => {
    return App.MIN_BOTTOM_MARGIN + this.calculateSubmissionBarHeight(photos)
  }

  calculateSubmissionBarHeight = (photos = this.state.selectedPhotos) => {
    let height = 0
    if (photos.length !== 0) {
      if (window.innerWidth >= 600) {
        height = SubmissionBar.MAX_HEIGHT_SM
      } else {
        height = SubmissionBar.MAX_HEIGHT_XS
      }
    }
    return height
  }

  handleLoginSubmit = (password) => {
    let error = null
    if (password.length === 0) {
      error = "Field is required"
    }

    if (error !== null) {
      this.setState({
        loginError: error,
        loginIsLoading: false,
      })
    } else {
      this.setState({
        loginError: null,
        loginIsLoading: true,
      })

      let state = {
        loginError: null,
        loginIsLoading: false,
      }

      api.login(password)
        .then(token => {
          cookies.setToken(token)
          state.isLoggedIn = cookies.isLoggedIn()
          this.setState(state)
        })
        .catch(error => {
          state.loginError = error.message
          state.isLoggedIn = false
          this.setState(state)
        })
    }
  }

  handleResourceFilter = (filter) => {
    let resourcesFiltered = []
    const resources = this.state.resources
    if (resources.length > 0) {
      resourcesFiltered = resources.filter(resource => {
        return resource.resource_name
          .toLowerCase()
          .includes(filter.toLowerCase())
      })
    }
    this.setState({resourcesFiltered, resourcesFilterQuery: filter})
  }

  handleResourceSelect = (resource) => {
    this.setState({selectedResource: resource})
  }

  handleResourceDeselect = (resource) => {
    this.setState({selectedResource: null})
  }

  handlePhotoDateRangeChanged = (startDate, endDate) => {
    this.setState({
      photoStartDate: startDate,
      photoEndDate: endDate,
    })
  }

  handlePhotoSelectionChanged = (indexes) => {
    // Update the selected photos using the new indexes
    const {imageSections} = this.state

    const newSelectedPhotos =
      flatMap(imageSections, (section, sectionIndex) => {
        return section.images.filter((image, imageIndex) => {
          const indexesForSection = indexes[sectionIndex]
          return indexesForSection !== undefined && indexesForSection.includes(imageIndex)
        })
      })

    // Update the selected photo in the confirmation component
    const newSelectedPhotoConfirmationIndex = this.nextConfirmationIndex(newSelectedPhotos)

    // Update the state
    this.setState({
      bottomMargin: this.calculateBottomMargin(newSelectedPhotos),
      selectedPhotoIndexes: indexes,
      selectedPhotos: newSelectedPhotos,
      selectedPhotoConfirmationIndex: newSelectedPhotoConfirmationIndex,
    })
  }

  handlePhotoConfirmationClear = (index) => {
    // Update the selected photos using the new index
    const {imageSections, selectedPhotos} = this.state
    const selectedPhoto = selectedPhotos[index]
    const newSelectedPhotos = selectedPhotos.filter(p => p !== selectedPhoto)

    // Update the selected indexes
    const newSelectedPhotoIndexes = imageSections.map(section => {
      const images = section.images
      let indexes = []
      for (let i = 0; i < images.length; i++) {
        newSelectedPhotos.indexOf(images[i]) !== -1 ? indexes.push(i) : 0
      }
      return indexes
    })

    // Update the selected photo in the confirmation component
    const newSelectedPhotoConfirmationIndex = this.nextConfirmationIndex(newSelectedPhotos)

    // Update the state
    this.setState({
      bottomMargin: this.calculateBottomMargin(newSelectedPhotos),
      selectedPhotoIndexes: newSelectedPhotoIndexes,
      selectedPhotos: newSelectedPhotos,
      selectedPhotoConfirmationIndex: newSelectedPhotoConfirmationIndex,
    })
  }

  handlePhotoConfirmationSelectionChanged = (index) => {
    this.setState({selectedPhotoConfirmationIndex: index})
  }

  handleSubmissionBarSubmit = () => {
    const {selectedPhotos, selectedResource} = this.state
    if (selectedResource === undefined ||
      selectedResource === null) {
      return
    }
    if (selectedPhotos === undefined ||
      selectedPhotos === null ||
      selectedPhotos.length === 0) {
      return
    }

    const id = selectedResource.resource_id
    const submissions = selectedPhotos.map(image => {
      let s = Object.assign(image, {related_to: [id]})
      s.caption = s.caption === null ? "Submitted via HerBridge" : s.caption
      delete s.thumbnailURL
      return s
    })

    this.setState({isLoading: true})
    api.submit(submissions)
      .then(response => {
        this.setState({
          isLoading: false,
          submitError: null,
          submitted: true,
        })
      })
      .catch(error => {
        this.setState({
          isLoading: false,
          submitError: error,
          submitted: true,
        })
      })
  }

  handleSubmissionBarArchive = () => {
    console.log('archive')
  }

  handleMapBoundsChange = (bounds) => {
    const polygon = GeoJSON.parse(bounds, {'Polygon': 'polygon'})

    // Make sure we don't have a resource currently selected
    const {selectedResource} = this.state
    let isLoadingImages = true
    let isLoadingResources = selectedResource === null

    // Start loading
    this.setState({
      isLoadingImages,
      isLoadingResources,
      resourcesFiltered: [],
      resourcesFilterQuery: '',
    })

    // Get promises
    let promises = []
    promises.push(api.getImages(polygon.geometry))
    if (isLoadingResources) {
      promises.push(api.getResources(polygon.geometry))
    }

    // Call EAMENA API using GeoJSON polygon
    Promise.all(promises).then(responses => {
      const images = responses[0]
      const imageSections = imageSectionsFromImages(images)
      const {
        selectedPhotoConfirmationIndex,
        selectedPhotos
      } = this.state

      // Calculate new selected photos from old selections
      let mutableSelectedPhotos = selectedPhotos.slice(0)
      const newSelectedPhotos = images.filter(p => {
        for (let i = 0; i < mutableSelectedPhotos.length; i++) {
          const selected = mutableSelectedPhotos[i]
          if (selected.id === p.id) {
            mutableSelectedPhotos.splice(i, 1)
            return true
          }
        }
        return false
      })

      // Calculate new selected photos indexes from new selected photo array
      const newSelectedPhotoIndexes = imageSections.map(section => {
        const sectionImages = section.images
        let indexes = []
        for (let i = 0; i < sectionImages.length; i++) {
          newSelectedPhotos.indexOf(sectionImages[i]) !== -1 ? indexes.push(i) : 0
        }
        return indexes
      })

      // Update the selected photo in the confirmation component
      let newSelectedPhotoConfirmationIndex = 0
      if (selectedPhotos.length > selectedPhotoConfirmationIndex) {
        const selected = selectedPhotos[selectedPhotoConfirmationIndex]
        const newIndex = newSelectedPhotos.findIndex(p => p.id === selected.id)
        newSelectedPhotoConfirmationIndex = newIndex !== -1 ? newIndex : 0
      }

      let state = {
        isLoadingImages: false,
        isLoadingResources: false,
        imageSections,
        selectedPhotos: newSelectedPhotos,
        selectedPhotoIndexes: newSelectedPhotoIndexes,
        selectedPhotoConfirmationIndex: newSelectedPhotoConfirmationIndex,
      }
      if (isLoadingResources) {
        state['resources'] = responses[1]
      }
      this.setState(state)
    })
    .catch(error => this.setState({isLoadingResources: false}))
  }

  handleMapViewportChange = (viewport) => {
    this.setState({viewport})
  }

  handleWindowResize = () => {
    if (this.resizeTimer !== null) {
      clearTimeout(this.resizeTimer)
    }

    this.resizeTimer = setTimeout(() => {
      if (window !== undefined) {
        const bottomMargin = this.calculateBottomMargin()
        this.setState({bottomMargin})
      }
    }, 300)
  }

  getLoginContent = () => {
    const {
      imageSections,
      isLoading,
      isLoadingImages,
      isLoadingResources,
      photoEndDate,
      photoStartDate,
      resources,
      resourcesFiltered,
      resourcesFilterQuery,
      selectedPhotoIndexes,
      selectedPhotoConfirmationIndex,
      selectedPhotos,
      selectedResource,
      viewport,
    } = this.state
    const noPhotosSelected = selectedPhotos.length === 0
    return (
      <div>
        <div style={{
          margin: this.getParentMargin(),
          transition: 'margin-bottom 200ms'
        }}>
          <Grid
            container
            spacing={App.MIN_BOTTOM_MARGIN}
            direction="column">
            <Grid item>
              <Svg
                svg={LogoHerBridge}
                style={{
                  display: 'block',
                  margin: '0 auto',
                  width: 111,
                }}/>
            </Grid>
            <Grid item>
              <Grid
                container
                spacing={App.MIN_BOTTOM_MARGIN}>
                <Grid
                  item
                  xs={12}
                  sm={7}
                  style={{zIndex: 0}}>
                  <Map
                    images={this.getImages()}
                    resources={resourcesFiltered.length > 0 ? resourcesFiltered : resources}
                    selectedResource={selectedResource}
                    viewport={viewport}
                    onBoundsChanged={this.handleMapBoundsChange}
                    onViewportChanged={this.handleMapViewportChange}
                  />
                </Grid>
                <Grid
                  item
                  xs={12}
                  sm={5}>
                  <TargetResource
                    filter={resourcesFilterQuery}
                    isLoading={isLoadingResources}
                    resources={resourcesFiltered.length > 0 ? resourcesFiltered : resources}
                    onFilter={this.handleResourceFilter}
                    onResourceSelected={this.handleResourceSelect}
                    onResourceDeselected={this.handleResourceDeselect}
                    selectedResource={selectedResource}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item>
              <Grid
                container
                spacing={App.MIN_BOTTOM_MARGIN}>
                <Grid
                  item
                  xs={12}
                  sm={noPhotosSelected ? 12 : 6}>
                  <PhotoGridList
                    isLoading={isLoadingImages}
                    endDate={photoEndDate}
                    startDate={photoStartDate}
                    sections={imageSections}
                    selectedIndexes={selectedPhotoIndexes}
                    onDateRangeChanged={this.handlePhotoDateRangeChanged}
                    onSelectionChanged={this.handlePhotoSelectionChanged}/>
                </Grid>
                {noPhotosSelected ? <div/> :
                  <Grow in={!noPhotosSelected}>
                    <Grid
                      item
                      xs={12}
                      sm={6}>
                      <PhotoConfirmation
                        selectedIndex={selectedPhotoConfirmationIndex}
                        onClear={this.handlePhotoConfirmationClear}
                        onSelectionChanged={this.handlePhotoConfirmationSelectionChanged}
                        images={selectedPhotos}/>
                    </Grid>
                  </Grow>}
              </Grid>
            </Grid>
          </Grid>
        </div>
        <SubmissionBar
          imageCount={selectedPhotos.length}
          isLoading={isLoading}
          onArchive={this.handleSubmissionBarArchive}
          onSubmit={this.handleSubmissionBarSubmit}
          resource={selectedResource}
          style={{
            transition: 'all 300ms',
            height: this.calculateSubmissionBarHeight(),
            opacity: noPhotosSelected ? 0 : 1,
          }}/>
        {this.getSubmissionSnackbar()}
      </div>
    )
  }

  getLoginForm = () => {
    const {loginIsLoading, loginError} = this.state
    return (
      <Grid container spacing={App.MIN_BOTTOM_MARGIN} direction="column">
        <Grid item style={{
          marginTop: App.MIN_BOTTOM_MARGIN
        }}>
          <Svg svg={LogoHerBridge} style={{display: 'block', margin: '0 auto', width: 111}}/>
        </Grid>
        <Grid item>
          <Login
            error={loginError}
            isLoading={loginIsLoading}
            onSubmit={this.handleLoginSubmit}/>
        </Grid>
      </Grid>
    )
  }

  getImages = () => {
    const {imageSections} = this.state
    if (imageSections !== undefined) {
      return flatMap(imageSections, (section) => section.images)
    } else {
      return []
    }
  }

  getParentMargin = () => {
    const bm = Math.max(App.MIN_BOTTOM_MARGIN, this.state.bottomMargin)
    return `${App.MIN_BOTTOM_MARGIN}px ${App.MIN_BOTTOM_MARGIN}px ${bm}px ${App.MIN_BOTTOM_MARGIN}px`
  }

  handleSubmissionSnackbarClosed = () => {
    const {submitError} = this.state
    this.setState({
      submitted: false,
      submitError: null,
    })
  }

  getSubmissionSnackbar = () => {
    const {selectedPhotos, submitted, submitError} = this.state
    if (submitted) {
      const selectedPhotoCount = selectedPhotos.length
      const imageDescriptor = selectedPhotoCount > 1 ? "images" : "image"
      return (
        <SubmissionSnackbar
          onClose={this.handleSubmissionSnackbarClosed}
          variant={submitError === null ? "success" : "error"}
          message={submitError === null ? `Successfully submitted ${selectedPhotoCount} ${imageDescriptor}` : `Failed to submit ${selectedPhotoCount} ${imageDescriptor} (${submitError.message}).`}
        />
      )
    } else {
      return <div/>
    }
  }

  nextConfirmationIndex = (newSelectedPhotos) => {
    const newSelectedPhotoCount = newSelectedPhotos.length
    const {selectedPhotoConfirmationIndex, selectedPhotos} = this.state
    let newSelectedPhotoConfirmationIndex = selectedPhotoConfirmationIndex
    if (selectedPhotos.length > 0) {
      const lastSelectedPhoto = selectedPhotos[selectedPhotoConfirmationIndex]
      newSelectedPhotoConfirmationIndex = newSelectedPhotos.indexOf(lastSelectedPhoto)
      const previousIndex = selectedPhotoConfirmationIndex - 1
      if (newSelectedPhotoConfirmationIndex === -1) {
        newSelectedPhotoConfirmationIndex = previousIndex > 0 ? previousIndex : 0
      }
    } else {
      newSelectedPhotoConfirmationIndex = 0
    }
    if (newSelectedPhotoConfirmationIndex >= newSelectedPhotoCount) {
      newSelectedPhotoConfirmationIndex = Math.max(0, newSelectedPhotoCount - 1)
    }
    return newSelectedPhotoConfirmationIndex
  }

  render() {
    const {isLoggedIn} = this.state
    return (
      <div>
        <MuiThemeProvider theme={theme}>
          <MuiPickersUtilsProvider utils={MomentUtils}>
            {isLoggedIn ? this.getLoginContent() : this.getLoginForm()}
          </MuiPickersUtilsProvider>
        </MuiThemeProvider>
      </div>
    )
  }
}

// Swap in the main react component in the "app" div
const wrapper = document.getElementById("app");
wrapper ? ReactDOM.render(<App/>, wrapper) : null;

// Export the app as a hot-reloadable component
export default hot(module)(App)
