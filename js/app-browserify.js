/**
 * create_table "galleries", force: :cascade do |t|
    t.string   "permalink"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "images", force: :cascade do |t|
    t.string   "url"
    t.integer  "gallery_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end
 */

import Backbone from 'backbone'
import React, {Component} from 'react'
import $ from 'jquery'

var Gallery = Backbone.Model.extend({
    defaults:{
        created_at: null,
        updated_at: null
    },
    url: function(){
        return `/gallery/${this.id}`
    }
})

var Galleries = Backbone.Collection.extend({
    model: Gallery,
    url: '/home',
    random: function() {
        $.getJSON('/random').then((data) => {
            this.reset(data)
            this.trigger('sync')
        })
    },
    unique: function(id){
        return $.getJSON(`/gallery/${id}`).then((data) => {
            this.trigger('sync')
            return data
        })
    }
})

var g = new Galleries()

class App extends Component {
    constructor(...p){
        super(...p)
        this.rerender = () => this.forceUpdate()
    }
    componentDidMount(){
        g.on('sync', this.rerender)
    }
    componentDidUnmount(){
        g.off('sync', this.rerender)
    }
    render(){
        var galleries = g.toJSON()
        return (<div className="grid grid-2-400 grid-4-800">
            {galleries.map((model) => <GalleryView data={model} />)}
        </div>)
    }
}

class GalleryView extends Component {
    constructor(...p){
        super(...p)
    }
    render(){
        var model = this.props.data
        if(!this.props.multiple) {
            return (<a href={`#gallery/${model.id}`}>
                <img src={model.images[0].url} />
            </a>)
        }

        return (<a href={`#gallery/${model.id}`}>
            {model.images.map((img) => <img src={img.url} />)}
        </a>)
    }
}

var Router = Backbone.Router.extend({
    routes: {
        'random': 'showRandom',
        'gallery/:id': 'showGallery', // <a href="#gallery/ajsndkajsnd">
        '*default': 'showHome'
    },
    showRandom: function(){
        g.random()
        React.render(<App />, document.querySelector('.container'))
    },
    showHome: function(){
        g.fetch()
        React.render(<App />, document.querySelector('.container'))
    },
    showGallery: function(id){
        g.unique(id).then((data) => {
            React.render(<GalleryView data={data} multiple={true} />, document.querySelector('.container'))
        })
    },
    initialize: function(){
        Backbone.history.start()
    }
})

var r = new Router();

