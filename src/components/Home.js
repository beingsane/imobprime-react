import React, { Component } from 'react'

import { 
  Button, Icon, 
  Header, Image, Grid,
  Menu, Input, Select, Form,
  Sidebar, Segment,
  Modal
} from 'semantic-ui-react'

import { 
  withGoogleMap, withScriptjs,
  GoogleMap, Marker 
} from "react-google-maps"

import GoogleMapsAPI from '../api/GoogleMapsAPI'
import ImoveisAPI from '../api/ImoveisAPI'
import CitiesAPI from '../api/CitiesAPI'


const MyMapComponent = withScriptjs(withGoogleMap((props) => (
  <GoogleMap
    defaultZoom={14}
    defaultCenter={props.defaultCenter}
  >
    {
      props.markers.map((marker) =>
        <Marker key={marker.index} position={marker.position} onClick={() => props.toggleImovelDetailsVisibility()} />
      )
    }
  </GoogleMap>
)))

export default class Home extends Component {

  state = {
    searchFormVisible: false,
    imovelDetailsVisible: false,
    searchMode: 'map',

    cityNameHomeParam: null,

    tipoImovel: null,
    disponibilidade: null,
    numeroQuartos: null,
    numeroGaragens: null,
    tiposImovel: [],
    cidades: [],

    cities: [],
    properties: [],
    defaultCenter: {lat: -27.5585325, lng: -48.4971103},
    center: null,
    markers: []
  }

  componentDidMount() {
    const tiposImovel = ImoveisAPI.getTiposImovel()
      .map((tipo) => ({ key: tipo.id, text: tipo.nome, value: tipo.id }))

    const cidades = CitiesAPI.getCidades()
      .map((cidade) => ({ key: cidade.id, text: cidade.nome, value: cidade.id }))

    this.setState({ tiposImovel, cidades })

    CitiesAPI.fetchAllByName('')
      .then((resp) => {
        const cities = resp.data.map((c) => ({ key: c.id, text: `${c.name}, ${c.state.name}`, value: c.id }))
        this.setState({cities}) 
      })

    this.handlePropertiesMapInit()
  }

  getCurrentPosition(options) {
    return new Promise(function(resolve, reject) {
      navigator.geolocation.getCurrentPosition(resolve, reject, options)
    })
  }

  async handlePropertiesMapInit() {
    if (navigator.geolocation) {
      // geolocation is available
      const position = await this.getCurrentPosition()
      const lat = position.coords.latitude
      const lng = position.coords.longitude
        
      const googleMapsResp = await GoogleMapsAPI.fetchLocation(lat, lng)  
      
      if(googleMapsResp.data.status === 'OK') {
        this.handleGoogleMapsRespSuccess(googleMapsResp)
      }

    } else {
      // geolocation is not supported ...
    }
  }

  async handleGoogleMapsRespSuccess(googleMapsResp) {
    const result = googleMapsResp.data.results.find((r) => {
      return r.types.includes("locality") && r.types.includes("political")
    })

    // console.log(result)

    try {
      const addressName = result.formatted_address.split(',')
      const cityName = addressName[0].trim()
      const stateAbbreviation = addressName[1].trim()
      
      const city = await CitiesAPI.fetchOne(cityName, stateAbbreviation)

      const properties = await ImoveisAPI.fetchPropertiesMostRecent(city.data.id)
  
      const markers = properties.data.map((p) => {
        const addressData = JSON.parse(p.addressData)
        return { index: p.id, position: { lat: addressData.latitude, lng: addressData.longitude} }
      })

      this.setState({
        center: result.geometry.location, 
        defaultCenter: null, 
        markers, 
        properties
      })

    } catch(error) {
      console.log(error)
    }
  }

  propertySearchFormButtonClicked = () => {
    document.getElementById("propertySearch").scrollIntoView()
    setTimeout(() => this.toggleSearchFormVisibility(), 300)
  }

  toggleSearchFormVisibility = () => this.setState({ searchFormVisible: !this.state.searchFormVisible })

  toggleImovelDetailsVisibility = () => this.setState({ imovelDetailsVisible: !this.state.imovelDetailsVisible })

  handleDisponibilidadeChange = (e, { value }) => { }

  handleCityNameSearchChange = async (e, { searchQuery }) => {
    let cities = await CitiesAPI.fetchAllByName(searchQuery.trim())
    this.setState({ cities: cities.data.map((c) => ({ key: c.id, text: `${c.name}, ${c.state.name}`, value: c.id })) })
  }

  handleCityNameChange = (e, {value}) => { 
    this.setState({ cityNameHomeParam: value })
  }

  render() {
    const currentCenter = (this.state.center !== null) ? this.state.center : this.state.defaultCenter
    
    const { tiposImovel, cidades, cities } = this.state
    
    const googleMapURL = GoogleMapsAPI.getGoogleMapUrl()
    
    return (
      <div>
        <Header as='h1'>Busca de Imóveis</Header>

        <Menu>
          <Menu.Item>
            <Button icon color='blue' onClick={this.propertySearchFormButtonClicked}>
              <Icon name='search' />
            </Button>  
          </Menu.Item>

          <Menu.Item>
            {/* implement search by region/bairro */}
            <Select 
              placeholder='Informe a Cidade do Imóvel desejado...' 
              className='icon' icon='search' 
              style={{width: 380, height: 42}}
              search
              options={cities} 
              onSearchChange={this.handleCityNameSearchChange}
              onChange={this.handleCityNameChange} 
              value={this.state.cityNameHomeParam} />
          </Menu.Item>

          <Menu.Item position='right'>
            <Button.Group>
              <Button color='google plus' icon='world' style={{width: 50}}
                onClick={() => this.setState({ searchMode: 'map' })}></Button>
              <Button.Or text='ou' />
              <Button color='blue' icon='grid layout' style={{width: 50}}
                onClick={() => this.setState({ searchMode: 'grid' })}></Button>
            </Button.Group>
          </Menu.Item>
        </Menu>

        <Sidebar.Pushable id='propertySearch'>
          <Sidebar animation='overlay' width='very wide' direction='left' visible={this.state.searchFormVisible}>
            <Segment style={{height: '100%'}}>
              <Form size='small'>
                <Form.Select label='Tipo do Imóvel' placeholder='Tipo do Imóvel' options={tiposImovel} />
                <Form.Select search label='Cidade' placeholder='Cidade' options={cidades} />
                <Form.Input label='Bairro' placeholder='Bairro' />

                <Form.Group inline>
                  <label>Disponível para</label>
                  <Form.Radio label='Venda' value='venda' checked={this.state.disponibilidade === 'venda'} onChange={this.handleDisponibilidadeChange} />
                  <Form.Radio label='Aluguel' value='aluguel' checked={this.state.disponibilidade === 'aluguel'} onChange={this.handleDisponibilidadeChange} />
                </Form.Group>

                <Form.Group widths='equal'>
                  <Form.Field>
                    <label>Preço inicial</label>
                    <Input label='R$' placeholder='0,00' />
                  </Form.Field>

                  <Form.Field>
                    <label>Preço final</label>
                    <Input label='R$' placeholder='0,00' />
                  </Form.Field>
                </Form.Group>

                <Form.Group widths='equal'>                  
                  <Form.Field>
                    <label>Área inicial</label>
                    <Input label='m²' labelPosition='right' placeholder='0' />
                  </Form.Field>

                  <Form.Field>
                    <label>Área final</label>
                    <Input label='m²' labelPosition='right' placeholder='0' />
                  </Form.Field>
                </Form.Group>

                <Form.Group inline>
                  <label>Quartos</label>
                  <Form.Radio label='1' value='1' checked={this.state.numeroQuartos === '1'} />
                  <Form.Radio label='2' value='2' checked={this.state.numeroQuartos === '2'} />
                  <Form.Radio label='+3' value='+3' checked={this.state.numeroQuartos === '+3'} />
                </Form.Group>

                <Form.Group inline>
                  <label>Garagens</label>
                  <Form.Radio label='1' value='1' checked={this.state.numeroGaragens === '1'} />
                  <Form.Radio label='2' value='2' checked={this.state.numeroGaragens === '2'} />
                  <Form.Radio label='+3' value='+3' checked={this.state.numeroGaragens === '+3'} />
                </Form.Group>

                <Button 
                  color='red' size='small' icon='remove' content='Cancelar'
                  onClick={() => this.toggleSearchFormVisibility()}
                />
                <Button 
                  color='blue' size='small' icon='search' content='Buscar' 
                  onClick={() => this.toggleSearchFormVisibility()}
                />
              </Form>
            </Segment>
          </Sidebar>

          <Sidebar.Pusher>
            {this.state.searchMode === 'map' &&
            <MyMapComponent 
              defaultCenter={currentCenter}
              markers={this.state.markers}
              googleMapURL={googleMapURL}
              loadingElement={<div style={{ height: `100%` }} />}
              containerElement={<div style={{ height: `700px` }} />}
              mapElement={<div style={{ height: `100%` }} />}
              toggleImovelDetailsVisibility={this.toggleImovelDetailsVisibility}
            />}

            {
              this.state.searchMode === 'grid' && 
              <Grid columns={3} divided>
                <Grid.Row>
                  <Grid.Column>
                    <Image src='img/imovel01.jpg' size='small' />
                    Disponível para Venda<br />
                    Valor: <b>R$1.500.000</b><br />
                    Rua Teste, número 1111<br />
                    Centro, Florianópolis - SC<br />
                    2 dormitórios<br />
                    2 banheiros<br />
                    1 vaga de garagem<br />
                    Área Total: 60 m²<br />
                    <br />
                    <b>Contacte o Corretor : Nome / CRECI</b><br />
                    Email / Celular / Telefone
                  </Grid.Column>

                  <Grid.Column>
                    <Image src='img/imovel01.jpg' size='small' />
                    Disponível para Venda<br />
                    Valor: <b>R$1.500.000</b><br />
                    Rua Teste, número 1111<br />
                    Centro, Florianópolis - SC<br />
                    2 dormitórios<br />
                    2 banheiros<br />
                    1 vaga de garagem<br />
                    Área Total: 60 m²<br />
                    <br />
                    <b>Contacte o Corretor : Nome / CRECI</b><br />
                    Email / Celular / Telefone
                  </Grid.Column>

                  <Grid.Column>
                    <Image src='img/imovel01.jpg' size='small' />
                    Disponível para Venda<br />
                    Valor: <b>R$1.500.000</b><br />
                    Rua Teste, número 1111<br />
                    Centro, Florianópolis - SC<br />
                    2 dormitórios<br />
                    2 banheiros<br />
                    1 vaga de garagem<br />
                    Área Total: 60 m²<br />
                    <br />
                    <b>Contacte o Corretor : Nome / CRECI</b><br />
                    Email / Celular / Telefone  
                  </Grid.Column>
                </Grid.Row>

                <Grid.Row>
                  <Grid.Column>
                    <Image src='img/imovel01.jpg' size='small' />
                    Disponível para Venda<br />
                    Valor: <b>R$1.500.000</b><br />
                    Rua Teste, número 1111<br />
                    Centro, Florianópolis - SC<br />
                    2 dormitórios<br />
                    2 banheiros<br />
                    1 vaga de garagem<br />
                    Área Total: 60 m²<br />
                    <br />
                    <b>Contacte o Corretor : Nome / CRECI</b><br />
                    Email / Celular / Telefone
                  </Grid.Column>

                  <Grid.Column>

                  </Grid.Column>

                  <Grid.Column>

                  </Grid.Column>
                </Grid.Row>
              </Grid>
            }
          </Sidebar.Pusher>
        </Sidebar.Pushable>

        <Modal 
          size='large' dimmer={false} 
          open={this.state.imovelDetailsVisible} 
          onClose={this.toggleImovelDetailsVisibility}
        >
          <Modal.Header>Detalhes do Imóvel Selecionado</Modal.Header>
          <Modal.Content>
            <Grid columns={2} divided>
              <Grid.Row>
                <Grid.Column>
                  <Header as='h2'>Disponível para Venda</Header>
                  Valor: <b>R$1.500.000</b><br />
                  Rua Teste, número 1111<br />
                  Centro, Florianópolis - SC<br />
                  2 dormitórios<br />
                  2 banheiros<br />
                  1 vaga de garagem<br />
                  Área Total: 60 m²<br />
                  <br />
                  <b>Contacte o Corretor : Nome / CRECI</b><br />
                  Email / Celular / Telefone
                </Grid.Column>
                <Grid.Column>
                  <Image src='img/imovel01.jpg' size='large' />
                </Grid.Column>
              </Grid.Row>
            </Grid>
          </Modal.Content>
          <Modal.Actions>
            <Button negative onClick={this.toggleImovelDetailsVisibility}>Fechar</Button>
          </Modal.Actions>
        </Modal>
      </div>
    )
  }

}