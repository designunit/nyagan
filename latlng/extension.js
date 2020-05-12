importScripts('https://unpkg.com/typograf@6.11.0/dist/typograf.js')
importScripts('https://cdnjs.cloudflare.com/ajax/libs/markdown-it/10.0.0/markdown-it.min.js')
importScripts('/latlng.js')

const LAYER_ID = '5eba714bdb03fc4f8b577a6b'
const PERMALINK = 'https://nyagan.unit4.io' 

const typeLabel = new Map([
	['idea', 'Идея'],
])

setup(async () => {
	return {
	    name: 'Nyagan',
	    version: '1.0.0',
	    description: 'survey',
	}
})

on('install', async event => {
	overlay([
        ['@', 'top-left', [
            ['button', { icon: 'arrow-left', href: PERMALINK }],
        ]],
        ['@', 'top-center', [
            ['html', { html: '<h1 style="margin:0;">НЯГАНЬ</h1>' }],
        ]],
        ['@', 'right-center', [
            ['button', { icon: 'question', command: 'ShowHelp' }],
        ]],
    ])

    showHelp()
})

on('idle', async event => {
    await toolbar([
        ['AddIdea', {
        	label: 'Поделиться мнением',
        	icon: 'bulb',
            color: '#008BFF',
        }],
    ], {
    	foldedLabel: 'Поделиться мнением',
    })
})

on('feature.select', async event => {
	const featureId = event.data.featureId
	const layerId = event.data.layerId
	if(!featureId){
		return
	}
	
    const fc = await requestFeatures([featureId])
    
    const feature = fc.features[0]
    const geometryType = feature.geometry.type
    assert(geometryType !== 'Point', new Error('Selected feature is not a point'))
    
	const type = feature.properties['type']
    const title = typeLabel.get(type)
    const comment = feature.properties['comment']

    const md = new markdownit()
	const raw = md.render([
		`# ${title}`,
		comment
	].join('\n\n'));

    const tp = new Typograf({locale: ['ru', 'en-US']})
    const html = tp.execute(
    	raw
    )

	await showMapPopup(feature.geometry.coordinates, ['html', { html, style: {
		padding: 16,
	}}])
})

command("AddIdea", async ctx => {
	return AddFeature({
		type: 'idea',
		title: 'Поделиться мнением',
		// placeholder: 'Опишите свою идею...',
		label: 'Комментарий',
	})
})

command("ShowHelp", () => {
	showHelp()
})

async function showHelp(){
	const text = `
# ПИТКЯРАНТА

Поделиться своим мнением просто: выберите отметку идею, проблему или ценность, затем укажите точку на карте и напишите свой комментарий во всплывающем окне.

Идеи и предложения: Что может появиться на улице Ленина? Чего вам здесь не хватает?

Проблемы: Что вас беспокоит в центре города Питкяранта, на улице Ленина и прилегающих территориях.

Ценности: Важные и любимые вами места или элементы, которые нужно сохранить или восстановить (исторические территории, интересные события).
	`
	const md = new markdownit()
	const html = md.render(text)

	await showPopup([
		['html', { html }]
	], {
		title: 'Help',
		submit: 'Got it',
	})
}

async function AddFeature({type, title, placeholder, label}) {
	const mobile = await requestState('layout.mobile')
	const info = mobile
		? 'Добавте точку на карте'
		: 'Добавте точку на карте'
	const info2 = mobile
		? 'Наведите перекрестие и нажмите ОК'
		: 'Кликните по карте'
	const coord = await requestPoint(info2, info)
	// const coord = await requestPoint('Кликни по карте', 'что-то произойдет')

	const form = await requestInput([
        // ['type', ['select', {}, [
        // 	['option', { value: 'idea', label: 'IDEA' }],
        // 	['option', { value: 'idea', label: 'IDEA' }],
        // 	['option', { value: 'idea', label: 'IDEA' }],
        // ]]],
        ['comment', ['text', {
        	label,
	        placeholder,
	        required: 'Вы забыли оставить коментарий',
        	rows: 12,
        }]],
        // ['email', ['input', {
        // 	label: 'EMAIL',
        // 	placeholder: 'Расскажите свою email...',
        // 	// pattern: {
        //  //        value: /^([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4})?$/i,
        //  //        message: "invalid email address"
        //  //    }
        // }]],
    ], {
    	title,
    	submit: 'Добавить',
    	cancel: 'Отмена',
    })

	const date = new Date()
    const properties = {
		comment: form.comment,
		dateAdded: date.toString(),
        type,
    }

	const f = {
		type: 'FeatureCollection',
		features: [
			{
	        	type: 'Feature',
		        geometry: {
		            type: 'Point',
		            coordinates: [coord.lng, coord.lat]
		        },
		        properties,
		    }
	    ]
	}

    await addFeatures(f, {
    	layerId: LAYER_ID,
    })
}

