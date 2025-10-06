import React from 'react';
import ButtonBase from '@material-ui/core/ButtonBase';
import Checkbox from '@material-ui/core/Checkbox';
import CircularProgress from "@material-ui/core/CircularProgress"
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import GridList from "@material-ui/core/GridList";
import GridListTile from "@material-ui/core/GridListTile";
import ListSubheader from "@material-ui/core/ListSubheader"
import LogoAmalInHeritage from '../Svg/logo-amal-in-heritage.svg'
import PhotoGridListFilterGroup from './PhotoGridListFilterGroup'
import Svg from 'react-svg-inline'
import Typography from "@material-ui/core/Typography/Typography";
import CheckCircleRounded from "@material-ui/icons/CheckCircleRounded"
import bs from 'binary-search'
import moment from 'moment'

export default class extends React.Component {
  indexBinarySearchComparator = (a, b) => (a - b)
  indexSortComparator = (a, b) => (a > b)
  
  static defaultProps = {
    isLoading: false,
    sections: [],
    selectedIndexes: null,
    startDate: new Date(),
    endDate: new Date(),
    onSelectionChanged: (selectedIndexes) => {},
    onDateRangeChanged: (startDate, endDate) => {},
  }
  
  handleImageSectionToggle = (sectionIndex) => {
    const {sections} = this.props
    const section = sections[sectionIndex]
    let {selectedIndexes} = this.props
    if (section === undefined) {
      return
    } else if (this.isSectionAtIndexSelected(sectionIndex)) {
      selectedIndexes[sectionIndex] = []
    } else {
      selectedIndexes[sectionIndex] = section.images.map((image, index) => index)
    }
    this.props.onSelectionChanged(selectedIndexes)
  }

  getLoadingContent = () => {
    return (
      <CircularProgress style={{
        display: 'block',
        margin: '32px auto'
      }}/>
    )
  }

  getEmptyContent = () => {
    return (
      <div>
        <span style={{
          fontFamily: 'Roboto, Helvetica',
          display: 'block',
          margin: 32,
          textAlign: 'center',
          color: 'rgba(0,0,0,0.5)',
        }}>No images found</span>
      </div>
    )
  }

  getMainContent = () => {
    const {sections} = this.props
    return (
      <div>
        {/*<PhotoGridListFilterGroup {...this.props} />*/}
          { (sections.length > 0) ? sections.map((section, sectionIndex) => (
            <GridList
              key={section.date}
              cellHeight={115}
              cols={6}
              style={{ maxHeight: 510 }}>
              <GridListTile
                cols={6}
                style={{height: 'auto'}}>
                <ListSubheader
                  component="div"
                  style={{padding: 0}}>
                  <Checkbox
                    color="primary"
                    onChange={this.handleImageSectionToggle.bind(this, sectionIndex)}
                    checked={this.isSectionAtIndexSelected(sectionIndex)}/>
                  {moment(section.date).format('D MMMM YYYY')}
                </ListSubheader>
              </GridListTile>
              {section.images.map((image, index) => (
                <GridListTile key={image.id} cols={1} style={{width: 115}}>
                  <ButtonBase
                    onClick={this.handleImageToggle.bind(this, image, index, sectionIndex)}
                    style={{
                      height: 115,
                      width: 115
                    }}>
                    <div className="overlay" style={{
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      backgroundColor: '#000'
                    }}/>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      backgroundImage: `url(${image.thumbnailURL})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center 40%',
                      opacity: this.isImageAtIndexSelected(index, sectionIndex) ? 0.75 : 1
                    }}/>
                    {this.isImageAtIndexSelected(index, sectionIndex) ?
                      <CheckCircleRounded style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        fill: '#fff'
                      }}/> : <div/>}
                  </ButtonBase>
                </GridListTile>
              ))}
            </GridList>
          )) : this.getEmptyContent()}
      </div>

    )
  }

  handleImageToggle = (image, index, sectionIndex) => {
    let {selectedIndexes} = this.props
    let currentSectionIndexes = selectedIndexes[sectionIndex]
    if (currentSectionIndexes === undefined) {
      selectedIndexes[sectionIndex] = []
      selectedIndexes[sectionIndex].push(index)
    } else if (bs(currentSectionIndexes, index, this.indexBinarySearchComparator) >= 0) {
      selectedIndexes[sectionIndex] = currentSectionIndexes.filter(i => i !== index)
    } else {
      currentSectionIndexes.push(index)
      currentSectionIndexes.sort()
      selectedIndexes[sectionIndex] = currentSectionIndexes
    }
    this.props.onSelectionChanged(selectedIndexes)
  }
  
  isImageAtIndexSelected = (index, sectionIndex) => {
    const {selectedIndexes} = this.props
    const currentSectionIndexes = selectedIndexes[sectionIndex]
    if (currentSectionIndexes === undefined) {
      return false
    } else {
      return bs(currentSectionIndexes, index, this.indexBinarySearchComparator) >= 0
    }
  }
  
  isSectionAtIndexSelected = (sectionIndex) => {
    const {sections} = this.props
    const section = sections[sectionIndex]
    if (section === undefined) {
      return false
    }
    let {selectedIndexes} = this.props
    const currentSectionIndexes = selectedIndexes[sectionIndex]
    if (currentSectionIndexes === undefined || section.images === undefined) {
      return false
    }
    return section.images.length === currentSectionIndexes.length
  }
  
  render() {
    const {isLoading} = this.props
    return (
      <Paper style={{
        margin: '0 auto',
        height: '100%'
      }}>
        <div style={{
          minHeight: 100,
          padding: 32
        }}>
          <Grid
            container
            spacing={16}>
            <Grid
              item
              xs={6}>
              <Typography variant="subheading">Amal in Heritage</Typography>
            </Grid>
            <Grid
              item
              xs={6}
              style={{
                display: 'table-cell',
                verticalAlign: 'middle'
              }}>
              <Svg
                svg={LogoAmalInHeritage}
                style={{
                  display: 'block',
                  margin: '6px 0 0 auto',
                  width: 48
                }}/>
            </Grid>
          </Grid>
          { isLoading ? this.getLoadingContent() : this.getMainContent() }
        </div>
      </Paper>
    )
  }
}