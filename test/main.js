require('dotenv').config()
process.env.NODE_ENV = 'test'
let abba = require('../index.js')
let chai = require('chai')
let nock = require('nock')
let _ = require('lodash')
let {assert, should, expect} = chai

const apiBaseUrl = 'https://api.airbnb.com'
const allBut = str =>  new RegExp('^(?!.*'+str+')')
const nockauth = _ => nock(apiBaseUrl).matchHeader('X-Airbnb-OAuth-Token', 'mockcorrecttoken')
const nockauthl = _ => nockauth().log(console.log)

describe('airbnbapi', () => {
    describe('#makeAuthHeader(token)', () => {

        it('should return null if a token is not present', () => {
            expect(abba.makeAuthHeader()).to.be.null
        })
        it('should return type object', () => {
            expect(abba.makeAuthHeader('z')).to.be.an('object')
        })
        it('return object should have property [content-type]', () => {
            expect(abba.makeAuthHeader('z')).to.have.property('Content-Type')
        })
        it('return object should have property [X-Airbnb-OAuth-Token]', () => {
            expect(abba.makeAuthHeader('z')).to.have.property('X-Airbnb-OAuth-Token')
        })
        it('return object should have property [User-Agent]', () => {
            expect(abba.makeAuthHeader('z')).to.have.property('User-Agent')
        })
    })

    describe('#testAuth(token)', () => {
        it('should return null if a token is not present', async () => {
            expect(await abba.testAuth()).to.be.null
        })

        // Mock endpoint: invalid token
        nock(apiBaseUrl)
        .matchHeader('X-Airbnb-OAuth-Token', allBut('mockcorrecttoken')) //anything but regex
        .post('/v2/batch', {operations:[]})
        .query(true)
        .reply(400)

        it('should return false for incorrect token', async () => {
            // console.log(await abba.testAuth('z'))
            expect(await abba.testAuth('z')).to.be.false
        })

        // Mock endpoint: valid token 'mockcorrecttoken'
        nockauth()
        .post('/v2/batch', {operations: []} )
        .query(true)
        .reply(200, {operations:[]})
        it('should return true for correct token', async () => {
            expect(await abba.testAuth('mockcorrecttoken')).to.be.true
        })
    })

    describe('#newAccessToken({username, password})', () => {
        // Mock endpoint: invalid info
        it('should return null if no input present', async () => {
            expect(await abba.newAccessToken()).to.be.null
        })
        it('should return null if username is not present', async () => {
            expect(await abba.newAccessToken({password: 'asdf'})).to.be.null
        })
        it('should return null if password is not present', async () => {
            expect(await abba.newAccessToken({username: 'asdf'})).to.be.null
        })

        nock(apiBaseUrl)
        .post('/v1/authorize', {
            grant_type: 'password',
            username: 'wrong',
            password: 'wrong'
        })
        .query(true)
        .reply(400, {"error": "mock invalid username or password"})

        it('should return error object if login details are incorrect', async () => {
            expect(await abba.newAccessToken({username: 'wrong', password: 'wrong'})).to.have.property('error')
        })
        // Mock endpoint: valid info 'mockuser'. 'mockpass'
        nock(apiBaseUrl)
        .post('/v1/authorize', {
            grant_type: 'password',
            username: 'mockuser',
            password: 'mockpass'
        })
        .query(true)
        .reply(200, {access_token:'mocktoken'})

        it('should return a token obejct if the login details are correct', async () => {
            expect(await abba.newAccessToken({username: 'mockuser', password: 'mockpass' })).to.have.property('token')
        })
    })

    describe('#login({email, password})', () => {
        // Mock endpoint: invalid info
        it('should return null if no input present', async () => {
            expect(await abba.login()).to.be.null
        })
        it('should return null if email is not present', async () => {
            expect(await abba.login({password: 'asdf'})).to.be.null
        })
        it('should return null if password is not present', async () => {
            expect(await abba.login({email: 'asdf'})).to.be.null
        })

        nock(apiBaseUrl)
        .post('/v2/logins', {
            email: 'wrong',
            password: 'wrong'
        })
        .query(true)
        .reply(400, {"error": "mock invalid username or password"})

        it('should return error object if login details are incorrect', async () => {
            expect(await abba.login({email: 'wrong', password: 'wrong'})).to.have.property('error')
        })

        // Mock endpoint: valid info 'mockuser'. 'mockpass'
        nock(apiBaseUrl)
        .post('/v2/logins', {
            email: 'mockuser',
            password: 'mockpass'
        })
        .query(true)
        .reply(200, { login:{id:'mocktoken'}})

        it('should return a summary object if the login details are correct', async () => {
            expect(await abba.login({email: 'mockuser', password: 'mockpass' })).to.have.property('login')
        })
    })

    describe('#getPublicListingCalendar({id, month, year, count})', () => {
        const testFunc = abba.getPublicListingCalendar.bind(abba)
        it('should return null if no input present', async () => {
            expect(await testFunc()).to.be.null
        })
        it('should return null if id is not present', async () => {
            expect(await testFunc({month: '1', year: '2018', count: '1' })).to.be.null
        })
        nock(apiBaseUrl)
        .get('/v2/calendar_months')
        .query({
            listing_id: "1234",
            month: "1",
            year: "2018",
            count: "1",
            _format: "with_conditions"
        })
        .reply(200, { public:'calendar'})

        it('should return a calendar if arguments are correct', async () => {
            expect(await testFunc({id: 1234, month: '1', year: '2018', count: '1' })).to.have.property('public')
        })
    })

    describe('#getCalendar({token, id, startDate, endDate})', () => {
        it('should return null if no input present', async () => {
            expect(await abba.getCalendar()).to.be.null
        })
        it('should return null if token, id, startDate or endDate is not present', async () => {
            expect(await abba.getCalendar({id:1234, startDate:'2017/11/01', endDate:'2017/12/01'})).to.be.null
            expect(await abba.getCalendar({token: 'mocktoken', startDate:'2017/11/01', endDate:'2017/12/01'})).to.be.null
            expect(await abba.getCalendar({token: 'mocktoken', id:1234, endDate:'2017/12/01'})).to.be.null
            expect(await abba.getCalendar({token: 'mocktoken', id:1234, startDate:'2017/11/01'})).to.be.null
        })
        nockauth()
        .post('/v2/batch', {
           operations: [
                {
                    method: 'GET',
                    path: '/calendar_days',
                    query: {
                        start_date: '2017-11-01',
                        listing_id: 1234,
                        _format: 'host_calendar',
                        end_date: '2017-12-01'
                    }
                },
                {
                    method: 'GET',
                    path: '/dynamic_pricing_controls/1234',
                    query: {}
                }
           ],
           _transaction: false
        })
        .query(true)
        .reply(200, {operations: [ {response: {calendar_days: []}}]})
        it('should return type object', async () => {
            expect(await abba.getCalendar({token: 'mockcorrecttoken', id:1234, startDate:'2017-11-01', endDate:'2017-12-01'})).to.be.an('array')
        })
    })

    describe('#setPriceForDay({token, id, date, price, currency})', () => {
        const testFunc = abba.setPriceForDay.bind(abba)
        nockauth()
        .put('/v2/calendars/1234/2017-11-01', {
            daily_price: 123,
            demand_based_pricing_overridden: true,
            availability: 'available'
        })
        .query(true)
        .reply(200, {response: 'success'})
        it('should return result object for correct arguments', async () => {
            expect(await testFunc({token:'mockcorrecttoken', id:1234, date:'2017-11-01', price:123, currency:'USD'})).to.be.an('object')
        })
    })

    describe('#setAvailabilityForDay({token, id, date, availability}))', () => {
        const testFunc = abba.setAvailabilityForDay.bind(abba)
        nockauth()
        .put('/v2/calendars/1234/2017-11-01', {
            availability: 'available'
        })
        .query(true)
        .reply(200, {response: 'success'})
        it('should return result object for correct arguments', async () => {
            expect(await testFunc({token:'mockcorrecttoken', id:1234, date:'2017-11-01', availability:'available'})).to.be.an('object')
        })
    })

    describe('#setHouseManual({token, id, manual})', () => {
        const testFunc = abba.setHouseManual.bind(abba)
        it('should return null if no input present', async () => {
            expect(await testFunc()).to.be.null
        })
        it('should return null if token, id, or manual is not present', async () => {
            expect(await testFunc({id:1234, manual:'manual'})).to.be.null
            expect(await testFunc({token: 'mocktoken', manual:'manual'})).to.be.null
            expect(await testFunc({token: 'mocktoken', id:1234})).to.be.null
        })
        nockauth()
        .post('/v1/listings/1234/update', {
            listing: {house_manual: 'manual'}
        })
        .query(true)
        .reply(200, {response:'ok'})
        it('should return response object', async () => {
            expect(await testFunc({token: 'mockcorrecttoken', id:1234, manual:'manual'})).to.be.an('object')
        })
    })

    describe('#getListingInfo({id})', () => {
        const testFunc = abba.getListingInfo.bind(abba)
        it('should return null if no input present', async () => {
            expect(await testFunc()).to.be.null
        })
        it('should return null if id is not present', async () => {
            expect(await testFunc({not_id:1234})).to.be.null
        })
        nock(apiBaseUrl)
        .get('/v2/listings/1234')
        .query(true)
        .reply(200, {listing:{}})

        it('should return a response object if arguments are correct', async () => {
            expect(await testFunc({id: 1234})).to.have.property('listing')
        })
    })

    describe('#getListingInfoHost({token, id})', () => {
        const testFunc = abba.getListingInfoHost.bind(abba)
        it('should return null if no input present', async () => {
            expect(await testFunc()).to.be.null
        })
        it('should return null if token is not present', async () => {
            expect(await testFunc({id: 1234})).to.be.null
        })
        it('should return null if id is not present', async () => {
            expect(await testFunc({token: 'mockcorrecttoken'})).to.be.null
        })
        nockauth()
        .get('/v1/listings/1234')
        .query(true)
        .reply(200, {listing:{}})

        it('should return a response object if arguments are correct', async () => {
            expect(await testFunc({token: 'mockcorrecttoken', id: 1234})).to.have.property('listing')
        })
    })

})
