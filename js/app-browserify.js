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
import sweetalert from 'sweetalert'
var remote = 'http://imgderp-api.herokuapp.com/'
var name

var Gallery = Backbone.Model.extend({
    defaults:{
        created_at: null,
        updated_at: null,
        images: []
    },
    url: function(){
        return `/gallery/${this.id}`
    }
})

var Comment = Backbone.Model.extend({
    defaults: {
        name: undefined,
        text: undefined
    },
    urlRoot: function(){
        return `${remote}comments`
    }
})

var ImageModel = Backbone.Model.extend({
    defaults: {
        url: ''
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
        return (<div className="grid grid-2-400 grid-4-800">
            {g.map((model) => <GalleryView data={model} />)}
        </div>)
    }
}

class CreateGalleryView extends Component {
    constructor(...p){
        super(...p)
        this.state = {
            num_images: 1
        }
    }
    _addOne(e){
        e.preventDefault()
        this.setState({ num_images: this.state.num_images+1 })
    }
    _create(e){
        e.preventDefault()
        var img = []
        for(var i = 0; i < this.state.num_images; i++){
            var val = React.findDOMNode(this.refs[`image${i}`]).value
            if(val !== ''){
                var m = new ImageModel({ url: val})
                img.push(m.toJSON())
            }
        }
        var model = new Gallery({ images: img })
        console.log(model.toJSON())
        // model.save()
        $.post(`${remote}galleries`, model.toJSON())
    }
    render(){
        var times = Array(this.state.num_images).join(',-').split(',')
        return (<div className="grid grid-2-400 grid-4-800">
            <form onSubmit={(e) => this._create(e)}>
                { times.map((v, i) => <div>
                    <input type="text" ref={`image${i}`} />
                </div>) }
                <button onClick={(e) => this._addOne(e)}> + </button>

                <button > create new gallery </button>
            </form>
        </div>)
    }
}

class CommentView extends Component {
    constructor(...p){
        super(...p)
        this.rerender = () => this.forceUpdate()
    }
    componentDidMount(){
        this.props.data.on('sync', this.rerender)
    }
    componentDidUnmount(){
        this.props.data.off('sync', this.rerender)
    }
    _create(e){
        e.preventDefault()
        var comment_node = React.findDOMNode(this.refs.comment_text)
        var comment_text = comment_node.value
        var model = new Comment({
            text: comment_text,
            name: name,
            gallery_id: this.props.gallery_id
        })
        model.save().then(() => {
            comment_node.value = ""
            this.props.data.fetch()
        })
    }
    render(){
        return (<div className="grid">
            <form onSubmit={(e) => this._create(e)}>
                <div>
                    <input type="text" ref="comment_text" />
                </div>
                <button>submit comment</button>
            </form>

            <div>
                {this.props.data.toJSON().comments.sort((a,b) => {
                    if(a >= b){
                        return 1
                    } else {
                        return -1
                    }
                }).map((c) => {
                    return (<div>
                        <p>{c.text}</p>
                        <span>{c.name}</span>
                    </div>)
                })}
            </div>
        </div>)
    }
}

class GalleryView extends Component {
    constructor(...p){
        super(...p)
        this.rerender = () => this.forceUpdate()
    }
    componentDidMount(){
        this.props.data.on('sync', this.rerender)
    }
    componentDidUnmount(){
        this.props.data.off('sync', this.rerender)
    }
    _like(e){
        e.preventDefault()
        $.post(`${remote}gallery/${this.props.data.id}/like`).then(() => this.props.data.fetch())
    }
    render(){
        var model = this.props.data.toJSON()
        if(!this.props.multiple) {
            return (<a href={`#gallery/${model.id}`}>
                <img src={model.images[0].url} />
            </a>)
        }

        return (
            <div>
                <div className="grid grid-2-400 grid-4-800">
                    {model.images.map((img) => <img src={img.url} />)}
                </div>
                <a href="#" onClick={(e) => this._like(e)} data-likes={model.likes} className="like-button" />
                {this.props.children}
            </div>)
    }
}

var Router = Backbone.Router.extend({
    routes: {
        'random': 'showRandom',
        'gallery/new': 'createGallery',
        'gallery/:id': 'showGallery',
        '*default': 'showHome'
    },
    showRandom: function(){
        g.random()
        if(this.interval){
            clearInterval(this.interval)
        }
        this.interval = setInterval(() => g.random(), 20*1000)
        React.render(<App />, document.querySelector('.container'))
    },
    showHome: function(){
        g.fetch()
        if(this.interval){
            clearInterval(this.interval)
        }
        this.interval = setInterval(() => g.fetch(), 20*1000)
        React.render(<App />, document.querySelector('.container'))
    },
    showGallery: function(id){
        var model = new Gallery({ id: id })
        if(this.interval){
            clearInterval(this.interval)
        }
        this.interval = setInterval(() => model.fetch(), 20*1000)
        model.fetch().then(() => {
            var gal = (
                <GalleryView data={model} multiple={true}>
                    <CommentView data={model} gallery_id={id} />
                </GalleryView>)
            React.render(gal, document.querySelector('.container'))
        })
    },
    createGallery: function(){
        React.render(<CreateGalleryView />, document.querySelector('.container'))
    },
    initialize: function(){
        Backbone.history.start()
        this.interval = null
    }
})

var r = new Router();
sweetalert({
    title: "An input!",
    text: 'What is your name?',
    type: 'input',
    showCancelButton: false,
    closeOnConfirm: true,
    animation: "slide-from-top"
}, (inputValue) => { name = inputValue })

