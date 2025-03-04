/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
'use strict';
import { Config } from '../../common';
import { Service, Context, ServiceBroker } from 'moleculer';

const QueueService = require('moleculer-bull');
// import createService from 'moleculer-bull';
import CallApiMixin from '../../mixins/callApi/call-api.mixin';
import RedisMixin from '../../mixins/redis/redis.mixin';
import { RedisClientType } from '@redis/client';
import { URL_TYPE_CONSTANTS } from '../../common/constant';
import { Job } from 'bull';
import { Utils } from '../../utils/utils';
import { BlockResponseFromLCD, ResponseFromRPC } from '../../types';
import { IBlock } from 'entities';
import { toBase64, toUtf8 } from '@cosmjs/encoding';
import { dbTransactionMixin } from '../../mixins/dbMixinMongoose';
export default class CrawlTxService extends Service {
	private callApiMixin = new CallApiMixin().start();
	private redisMixin = new RedisMixin().start();

	private currentBlock = 0;

	public constructor(public broker: ServiceBroker) {
		super(broker);
		this.parseServiceSchema({
			name: 'crawltx',
			version: 1,
			mixins: [
				QueueService(
					`redis://${Config.REDIS_USERNAME}:${Config.REDIS_PASSWORD}@${Config.REDIS_HOST}:${Config.REDIS_PORT}/${Config.REDIS_DB_NUMBER}`,
					{
						prefix: 'crawl.block',
					},
				),
				this.callApiMixin,
				this.redisMixin,
				dbTransactionMixin,
			],
		});
	}

	async _start() {
		let listAddress = [
			'aura195hcdvhkqy3xvr35wk80tz3ma7evrpwdjyqdlz',
			'aura1g4unx2t46n0dwgewmhd67cynzjmazf2f5xh36w',
			'aura1w7z99a4rp4c90yu6m56lzn88su6jyahe70max4',
			'aura1ld3wp5f6lffcexgdnrhshzms4ffqyg56xxuage',
			'aura1ewr69wrcjpnqkum05fvndpf09l8xzqrdeselh6',
			'aura1x49gchdcp9sp6mf7u7emschxwr23ujaavztzys',
			'aura1mfwuqzl0qtyaqhmkljmc6ew00utun66s2zu963',
			'aura1ryxlh4hz4vcmt6hctytgc4u5tswyw30a5009fn',
			'aura1vr92cn5s2v9vhjffe4gwqc85uhlrp3e6fpq783',
			'aura1482fclehyxp7lp8l0j5x6yc458fxcc603glcpk',
			'aura1hua0ldym6pcjxt6j657qjvn2hysvvt27eh95sw',
			'aura183u07zr69ax5n6p2ywtlx864utn7pzf73ftrll',
			'aura177x2w2atrrrp8sk6z7l595sgd4ugnaa80auch4',
			'aura1dg6ftamd78dhhayvy94zemxajr0pp27wzxmawh',
			'aura1hl05fyq97dj4888pqeyw8pcs0t62wpzgka7s40',
			'aura168ay44nrw9mt38ngnv0r8uxdapnxhfh4u3vu7y',
			'aura130npdwfg0kf5yhvjk68uuupuqw3us8mv0kwe2s',
			'aura17yhqlcqmhc7f97j5fuv2l3lj07krt0vnj2muvk',
			'aura1rt6f0txhp46g3uuhqrfkfrlpznq4pzwlwp63vl',
			'aura10vcrs4r69rtwzfn2zyjgv29cfcwr4ry0cdpnvt',
			'aura1ce26fc8g84kyhuqh0ycr2jzmghqyun7083xkj8',
			'aura1c27g0wu5mz3ftgwf9c07f06c0gmuhvnlvgg49t',
			'aura1cczjtx0hyd37kmd8lz6c0xczp7kyqp5tlgm5fd',
			'aura1cevxlea0uny9un53h5fet5hafxpttf3pypawdw',
			'aura1luwyzsc5pnyqennj9ufyquqfue9nqxvqmzskk0',
			'aura15elax6s9kafhaws8td0u620687g44j094slnqc',
			'aura1r8xhh6yk7szsxldducxq4clj2wmk934cs4jhwv',
			'aura1mkrfg5nz0qmt77zk92xwcrljl8hg0sfy4pj8pq',
			'aura1ugpufxzcafa0gm3v2lkl4eld2rcwqvgxyzwatr',
			'aura38fC57698b5Fdb513be976BbC3Ea9A329910a2c1',
			'aura1ytk4ght7q7akf7pcmxdc7xvq86z0ccjqd78plg',
			'aura1zgln00xfkat002metjuwjta32uy06c3se5evt7',
			'aura13gqwfdgflxf8hn2sfwq26lphdtecz8kzv98cyj',
			'aura18axw59wyqnvt0qrzjtqnudgsykgs2jcsfdh8mm',
			'aura104qtc25804q725pzlkmp653k6z4yj4m9f00n6w',
			'aura1w7yd6wmsetwn7gnh28p57n5j976fwckn9p3yu3',
			'aura1mdhxj6zq4xpvvpmjldsmam2aeylu4gx9vqt2ss',
			'aura1wyaxx0u3ucw06np6rdsneyhuanp5ama30q8pmn',
			'aura186q962llvlx4w30lkkqcqsvlmsjyqrp8vs8fkv',
			'aura1ua72hl008dcu7xtgy09u3jwfkhrrxprlp05syd',
			'aura1ahcn3wc032w4nx97ustev0e5lcv6ndv7prdhv4',
			'aura19pj4nd6l2yyz4f0ppx2edfvyruvylsaavzvsx4',
			'aura1g407tgkv288y3urkggy25kdvyrgcnxl9rqyehp',
			'aura1lpzux772tecz8za7j5evgscffz2r3924jlrt6j',
			'aura1u3c4zqmh7sfdtz32fntgkzja2mtsrn98ac8uh0',
			'aura1c2keezppmxnxmev7e8evn4xav6yju7ka2xnesn',
			'aura1fa3z0ahzjvzjwm535jf8aqdaqhxdumhsxnpgjn',
			'aura14g2em5y9ucln6v8m30qa2huscmydrj3e48ccj6',
			'aura18eskgj00kqg8q8429jd43yk8ct89yk89y65yw7',
			'aura1hzsvaumhq4epqy6228vg5glm3wz4sf0kaqmya5',
			'aura1kp845lh9expzrmsx4wfqvatlwf6wekc8788453',
			'aura1ngyfz43wqzsa3v7dmarjy6gg4skkantwp3xe77',
			'aura17vsf7td7l3adj2qk3a97rlgxu2jj7huqaf78wf',
			'aura16szt6ruaavr8wv5amlqpgvhvlessu8n2egqa3r',
			'aura1769dzc2zx740hymflqmlvxxzre4ykqayzxta8q',
			'aura1fy2y60g7fh066xfl4cs5jh3v8ay0htw809n2tj',
			'aura1ll88gy6nc55x6pxqflgme6fh7c66zp0sllught',
			'aura1g9zuc64asau9r24q9lmdhktd43spd0ucvqdwqq',
			'aura1uycfr72xd4p8f85td492m78xg4l79pf3lk0r3z',
			'aura1je4hqtv7e2pakprxhjy6f6d7sdgxw6x2emzjmn',
			'aura1yjf68x7e3l8u53l6qea2z5zr202wn89px93w3r',
			'aura1c3acjuenv3pcfzr3tj0ttlnjfu88uk6z6yaxvk',
			'aura17s735l2qyeadnphp3td4l8z0whx6jzau0ykdqd',
			'aura1lu8xqqj372jekj5vpdj59kjjxv56zz0f30zjjd',
			'aura1xe3l8s9s9yjquw97wdjfr5e3zag63tk876nf8g',
			'aura1gexuf9mf6u0y2mkf23mctpgd4wh9zzyxvxxqn8',
			'aura1s43ctsweeywnpkj86qf2ynypcq0l6h5y6zm27f',
			'aura1d2hs5h4h9yyuyg4ss0u8cq30xvnv0ys5s5u7et',
			'aura1j3a68v60dtxtd6ysr8vzvr7qxzt764zrarhzfk',
			'aura19d3k8rs9g2f5a5a8v6h9xkfeu0g9rp32wxkuq6',
			'aura1a8qxgtach45tx557h6uu25dkzmqeexqd3acjhm',
			'aura1l3l5cketh0cmunwqqkj0996e94l2dteqt5re67',
			'aura15g9pass50y43p8tswwv7yj4s4nnarm7qern5xa',
			'aura18h4565ec2ak9d9u8ayjpe9ylk73flrs4jfq485',
			'aura1qwvl904up509xayjhrs6gmuxfts7w0r33nmwqy',
			'aura15jqx77lgy94dfly0u5yv5lejqy6hqyycq0l5q5',
			'aura1q3truhus7zwhazzuaczygc5fy3u4a2frknavq2',
			'aura1qerukkmaufkzdn696n29e999jmsk6dkq08xj26',
			'aura1528duj6qtaqezhxlj7rvz6z0r5crkwwk4zvh88',
			'aura1a028w08wslepl85p0u5fza39ykty277qhx2vev',
			'aura12aghm4vtwma89mk8xy93zy07mq0nlwr24wgczr',
			'aura13p9cvq5atl2cagnjsxsm72vnyfkfnnguzhc2qs',
			'aura1fwtjkpt4c4s0gypz2676r5pa5ftxq7xa4egxe3',
			'aura1yagqjylur6uq4fessttutvkjeklnucya6sx5sf',
			'aura1tswwmrqydq3pe05sswcs2f3qe7k2wwsaaqyx99',
			'aura16d3syv9scmjfrteedvql59zk9m0zldwulcdzhk',
			'aura168rg366kzd656703gkef735wr40zcr79zuwp4h',
			'aura1mxsu7s050cdsauas39uzfe8k044l70kfn66mmq',
			'aura1nlh95pasnkhfm5qyphrvc79kc6vkx6yf3lzmvg',
			'aura14qgh4z32jpdtje2zgggdtllfmcmy20dlpla0lk',
			'aura1ly6qjtla64decegsuhdyyrxp9s6g5gqhfxhvex',
			'aura1pnfer4xwfhzvnke478je5ck3ulfe2u3c9hy847',
			'aura1cryyj7exmymze835zwrjl5vvgvn3qvumkmp20h',
			'aura1965tmcxs8w4y4nu44vldnxwt3vcntvape609z8',
			'aura19p9ryr6jn4565f3ace942e94pcfr5vpeudqv6p',
			'aura16e0zjh6yp4dg83qpkztn7mc3gf2aq3dcv7e7kp',
			'aura1598z7x9u3wc4ykd4zemqyfusa0fmzm7mzcjs76',
			'aura19f7f7ylewuf6wzenqn5p4l4nsrrwcta6w8hghe',
			'aura1ml0wpgnvdmzd26r6qgjmzedxpuydugty350ntt',
			'aura1das7qstvmzcjwp6dakqcm00lq9lvtgkswln8g4',
			'aura1w6tq6ygpdpy8chc378c7hr8694nw5palqmd0py',
			'aura1wqlq8s530fxm45k6qke40h4pf09h4rhj6j80ux',
			'aura168ah3d6xtacspfpgdfzdpshnpn2v2v7cdlj44a',
			'aura16vw9sx27t0ld25zwjapumz263glwlxsyhnl8vn',
			'aura16y44yh9u7emykpkv44rtgeyjfeufrz44kpppx8',
			'aura10vufz5p78m084epchncuz2y02khfys9skgyzp6',
			'aura1z3ckaakkyz598kncu4ftkhxmm02akmdan7epcj',
			'aura1dt3ta0z2dgkj3wu83pvgqskuq4q6gcnx2pzwga',
			'aura1nqarlq23scu43wnkx2nk06nsjrd5f3a3094rtg',
			'aura1u3paq2ysmkwaua8xeachxtc4q7mqk2efgkv9hs',
			'aura1pwvte8ka6mgayd40z2zxrwg0wt0jfwyl36qhef',
			'aura1jur5y6lsq5ur3hxqmhkcrpx4nc0hgm3qnzt0cl',
			'aura1a3dktxfcg7e4y3w9w5ncn43382h38sgct798d2',
			'aura1a2cnnzm26zahetj2s0rxz3tkcjjhqjqt2qdd4m',
			'aura16asyrq7hgtjwk4v32l4zqvlfv6xaul3rx3ytw7',
			'aura1qrw4lme7qa954638e7w9u569zq8pgr84xy7xxl',
			'aura1pwuk25thsa7leu55aj6dpehwq0tmj7lr6gnmr9',
			'aura19apla94gz457y2u03gkpq6p6ephgmymxdw9253',
			'aura1nc2cl2nhsjezwk5wpmlnpzl7wl4setghp2vn2h',
			'aura1jafv7mweknkv46nmg6r78ftj5ktfsts99wkwtu',
			'aura1rqll2d4wyylvl03ht6mhglswj46gkcr3ksvkm7',
			'aura18jrvntf406awra3dzx7657c97vzm7k07usr450',
			'aura18fe3z2e58x6jkqnly7fp30l0fu2nvc6nffy86f',
			'aura1f4kp7gqumq4qux7338y25934a7z600xcytga84',
			'aura1g657rjyl768lxqx2hmtvvyfm5yhraqw75hakmh',
			'aura12ljtyweh3y9706rkxf93kjmgugs3e7ne5a5p2n',
			'aura17l6gwy77jnxq2zaaxp96nga6h7w27ecv2yy429',
			'aura1my4ffwxey990zm8t2j4hd5rlq8s57nf0wsr8qg',
			'aura1stjxpkq8mep33hze99jf280m8efkkgz3qmfa7s',
			'aura15ucd80aednzdgvd59py6z00gvt6ywf9rfmh2gz',
			'aura16ea6krn4vvdukn7dae7p0l9yqkuzlufjw5fuee',
			'aura1xk6nnn0gen9n9fduz0t3twyzt8c2uzedy2545a',
			'aura1555hhrav8nklvphu0deeykffhc03zs2wj8rq6t',
			'aura1ar42ehx3spphfg6rlacdcdy326qxcrpdwvxjwd',
			'aura189ty8nanmvfsjmsgd0f0cvpnzj9ace3etft93q',
			'aura16tm055dn07prysr0yht5z467225n52aflq8a4u',
			'aura150zhsrpv5sgnhyvdw3xamc24xmvupajlctwy7l',
			'aura19agdjkr2vwz4qws98p9va9u9f0p0fcttq8d6ed',
			'aura1jc5c2x4ygpztn3mv9ptxsurl0czm47ccl8fe5a',
			'aura1lm8fkt6gplhq6uqmu0fxkk6amvujweh5nd63sq',
			'aura1txyhhtueazwxu5p0rn06gp7spxtg8cetfef8xa',
			'aura1m9uf90hagnr0azs88vlfp83twm4cyhkfdcjxhe',
			'aura1303lwps2jz9dk5eapd6fpgs0ftrc3cd8m99t7r',
			'aura1htrgaq0j6q34gmlhy88h3sg7detc8mrja5ycpa',
			'aura1fgxl5a4e08yv79k5mfy83y55sne38maafeks69',
			'aura132ylqzudwd68hx8a7jwz475q774xkxvx7llg9d',
			'aura1c3egxfp0wj6k3dmjch6dr5vmuevs5jtajm9g0e',
			'aura1chqwklsqsmvxfn0jhh3m7crv6j4kg2z0wzlsq3',
			'aura13gx2s6hzs2sf7j0syrf20070lzgwd2znjfjhdw',
			'aura1r2d4ezghfp8gl9k7aam7puypv4793tlmfpm0lv',
			'aura1pfkjrnsch83dg029dz5px79g9hpdj73eh0pv0u',
			'aura10dpsdmx2jm32fe4sudg79l9jrh5aep8l28yq2d',
			'aura1v2pakpgldpsfpz25kfnvan9nnz6zd9w5zks49d',
			'aura1a4axhr6xpwhm5kr4g4ewlshu68ngx89emtxgfp',
			'aura17df8n980tjyes7pzu0vedjqe6tpynjjzw9xkyx',
			'aura13kncgv2q6fc3lf840xc53jnzvcxena4a5guelp',
			'aura1w8m74hhh7ec4aanrt8n9clw3fm8rk7uzn9s8lq',
			'aura1gw0p2s5434a5xfazwc4lumynk42vkzlrja0em7',
			'aura1cnek7mpunxssseelej2h5va4delkjwwsddu5qd',
			'aura1p4yjt4n900e8enlpp47lly006pp9jljl4rzclm',
			'aura1hyn6hnwmuueevz2xfp8jmhaszsvvfuwn5u5ly9',
			'aura159af5m82ea5w3qgnnm4w6aemc4krq4zehr8nj6',
			'aura1cmhuh7n6kf0ejxm6w7andpcyhyx5nzcpq67c3d',
			'aura1rfl8xmz6p2zfgyv94gmcc6yk0jg34j7k6ckuvc',
			'aura14m6x5pmf2k0cq73nrnu3gmus04uylel970j80c',
			'aura1u9vxwlnhhcwupwul5ejs5cpnxlg5yhmmm9l05q',
			'aura15hw2uaq8qe5g7y347u4p506fektcymkdyg79mm',
			'aura14qul7hpvkp0kj59xskn3gzpskmh8r5mq9pqnrk',
			'aura12q69u0wu45dp0m9j53wmgcs2rmnaara9tv0tw5',
			'aura1ysfycalvgne6enqp6jy3lhpsvc5cayul7m3s38',
			'aura13nmrlzy08qnxly57xyl359a0ly242nkujeysy9',
			'aura13t9a7kpezmrtn3plsz3pz6nyywcvfyyh9thw5j',
			'aura1m8ejpzpwkxcwxwy34zq95calm83xj6y6pced02',
			'aura164mgp63c4y9h2em9j0nfh4q3ju0hdf33xh9cmp',
			'aura1np96rzugs3f2auhcu8vhqelst0lphldqy24c69',
			'aura1hhnzxh480h0e635x0f4sz8d509vx7ckp7e94m4',
			'aura1sxa5gxl3nynnn6cx2czlxqnld5e3v0vs8qnpdh',
			'aura1q8h3ektlzwuejrrk6yqjstxa4d0hqgptrn0rs8',
			'aura1f4qcc2lq8y64p4ju93j5mmes3t0hr7t0r0hhct',
			'aura1gxsz9ren00ax0eq8xqeredxdhpn6h3frd3jqy0',
			'aura14vtd6hqdyljj6vfhe7ag6mwpaw87vxnjf2m2g8',
			'aura16j7yy8w9n9epxydaalypg47lcm96v7ty9z9q4k',
			'aura1ctnty45uxyclkk2y5uc7y4sgjq6dfd68n0qv27',
			'aura15lwwumhj6wfntzqa7qhyyylhwz744zg62k3vm2',
			'aura15dmavnahzskv4f4rx8l7was4fpxdgls8nsfkxn',
			'aura1cler2uj32yg9xnehncss5qyuudls4mahtugrv3',
			'aura1tqzla3lchgz9tuqg453l6fc0m5r86nvqwdc5dn',
			'aura1g4n2a7q5mehdz0yur3h8tg9hnw0ysd7xppej2y',
			'aura1h6adxwmz38wuqfcthf5qh7egd6frfechsvvq9u',
			'aura1cf9htrhzh4wr6hzkghc0485pruu2ahu4mrhp2j',
			'aura1d9d7p57am3a7lapdwp6qsqrds66cqzk2rrmdq2',
			'aura170u3s0r4u942c4x2z7704z0j0kda0kef8lntam',
			'aura1qp3fnehx4y0lqt24mx7qd87cvanlc9h033cqtu',
			'aura1ykq4dlhujd72dykau0dzj38ej5edh4gprh7mfz',
			'aura1tnjtglz7rpfe42686nag8cakm3eaz6y5denk5q',
			'aura1qqeh20nlzwa4e6ehh2gu4k674uw5h4g3e9kq53',
			'aura14wzfxqy99k44ckdmvlkvfufu6e369h6chm55kv',
			'aura1snxzkdv07uwxh2xchcl64hzy8nzcnh4d3mhtgc',
			'aura1spnm98ytrgs9t8pm6ufnplhx5tgk0ssyv04yy8',
			'aura13j5q8mk3w5eu0h57hyx5ahcq6cpqkm83uxzmn3',
			'aura1stmeg4wk5ga0g7flgaa69w02620ujq98cjyqm3',
			'aura1zx4m8ky4uxzj6gc8h836kfquqtkcwx6cva6cds',
			'aura1nlq4zpvkgz369kysqkufmnhpye9x8dpsat2ac6',
			'aura1npzjeg2k02v38a5pq5veptwn2z8m28yvyjl0pj',
			'aura1husdzx4puavkxv9zpn5mhwsmtepte4phvkrvx3',
			'aura1qchcevmk0cuwu3ztc3k9xn6q2zfkkuc4w05fp4',
			'aura193vlfj5rwp03msj0rwl2yn2t4v38pznq5j0u4g',
			'aura1yrs8semtz6jxx593yss4dy8ymu6l2902777qlc',
			'aura1jsrq84a6zvgf90d4gjxft28cufed6sakj0xlt0',
			'aura12k0z284e64l93dhyqhnjdquvzdv6y980hamqhd',
			'aura1zx3c9az8rmvahn4y96lzgarh4twdv876t8yth9',
			'aura1q3a6fkh5n90mfk72mx9hf7e8wcvf28zsrmfh6r',
			'aura1xxn48zfuwed228py7x8w4cee3kw03rtkdqsg7z',
			'aura1ss53pnm5snclu7lj4g6e9rxlhfwnz025gtcm08',
			'aura1q4vjhgqpx5t4rvd9ne9e23peef2acnhva4ydcj',
			'aura1cr87jhfe2slctt23xyzk7m5yyqxnyr7xexmd6q',
			'aura1lwhdhju0qptp0r5nvsnx8at0qd3uhx6p24q0c3',
			'aura1naehrgqmw0zd7p450wra03rlf9kfjfy89mlemp',
			'aura1sdvhlj9tehnxpht3d4lm4ch97422ygkllwcu24',
			'aura1n8d45d0f2fvncsmqw3jhc805vtkm654k0ld3c6',
			'aura1rmkyc7h6sc3769au8qazjxxfem0j2cp39ndjmd',
			'aura15t6ngtmc0eyln37r3qm7p2h809el7j87cn7lq4',
			'aura1lkw0ejpfhuh6mw0452ckdz9wju8l2eeuza8h4q',
			'aura16fpvw0jrprp59h43hlc87d8euv2y4h75emv5sa',
			'aura15m4majl4f96j07rldkcduvtwtv9rzl95rkpsje',
			'aura1f8xfqdn3cvt2duzjpfteer8772fkj3zmcl4zlx',
			'aura10tvuuef9n8zn09u3qqf3l5wdhq9twkmq2786td',
			'aura1esv7zkmxhghyhc8sfcj27jgcn05ee5srcldw0e',
			'aura18va6cnnxrmvr5v2r67w7rwtrpgfpem6pv7l5nx',
			'aura1rpl537h749ugja20n0raysq43ptc005uzcs2t7',
			'aura1xw0k4a4slncpqhl3dsdwj0vcu56cvztlhh3zp8',
			'aura1fpdyamvgrsnud94y2zwjmstjggc6zvxmphcu7j',
			'aura1rlampv4xrugte0x40wjqfssjzx9450dgfrekqw',
			'aura1y8xujwtgtv654cgsj20knl72pulkyrpe0a3ayc',
			'aura1zcsmykewyuwr25d4egmjmvuc3xpf38fupunthq',
			'aura1uprye9vn4fmcpg00mcw09j00gtqp7aqp822h4p',
			'aura1xa2h00acfspc6dzaypdlvxg2y6pfguwtv6z642',
			'aura1a4vfd6ekevmjj5wg2ch4vz0g2e0rn3fftcpxy6',
			'aura1h4meqm8jzrn0rnmu3aflm7qezwjxv7m8dya3s2',
			'aura1pcr5hmsmdeg8dlvh68096ksz02c34kaxcq92yn',
			'aura19mfhlq33d3ku6x5hwmasshfgyfp054kvxvsvze',
			'aura1skus5wj36rvxrckafzm2frlgexy8r94j06znqr',
			'aura1xcnjks52z0zwz7dacjf9wur4car8cc0dt54z0f',
			'aura1fz8w7rsvg2tvcu9qqp9nrqvykmrpqwwc2wetwn',
			'aura15f6wn3nymdnhnh5ddlqletuptjag09tryrtpq5',
			'aura14fm25lq8fd0mhq5spe998xxdul85avk7r0ggcc',
			'aura1zhrstufvachxmddfscdchsyqvhwekuuxm7p3q4',
			'aura1hu6r4z4rhesd0667l5kw46wufzcxsn42f7852d',
			'aura18qmtey7f0f3rz6m5qrxwktcp6q87sjrntuzupy',
			'aura1ane8pxw30uuhml9tsd0tw6suulcgpqmsg47qcx',
			'aura1mc5vsguezh63450u505w73xepg0htfzx57v63q',
			'aura16yflnk4xcdujc6ma3f6lr2ypvnq05mn7sdycqn',
			'aura1r0pl9xvg3vqzfftgx45kgwd93u3edngwgchual',
			'aura1u7d93nhd47fx404ly48vahwyf30uv7uqp5kavh',
			'aura1efjm5a7mpqkkj598tft04rgvg0txp984r5j7lx',
		];
		let url = ['https://lcd.euphoria.aura.network'];
		let fromBlock = 826330;
		let toBlock = 841584;

		let listResult: any[] = [];
		// let query1 = {
		//     "tx_response.height": {$lte: toBlock, $gte: fromBlock},
		//     "custom_info.chain_id":"euphoria-1",
		//     'tx_response.events': {
		//         $elemMatch: {
		//             type: 'transfer',
		//             'attributes.key': toBase64(toUtf8('sender')),
		//             'attributes.value': toBase64(toUtf8('abc')),
		//         },
		//     },
		// }

		await listAddress.forEach(async (address) => {
			let query1 = {
				'tx_response.height': { $lte: toBlock, $gte: fromBlock },
				'custom_info.chain_id': 'euphoria-1',
				'indexes.transfer_sender': address,
				// 'tx_response.events': {
				// 	$elemMatch: {
				// 		type: 'transfer',
				// 		'attributes.key': toBase64(toUtf8('sender')),
				// 		'attributes.value': toBase64(toUtf8(address)),
				// 	},
				// },
			};
			let query2 = {
				'tx_response.height': { $lte: toBlock, $gte: fromBlock },
				'custom_info.chain_id': 'euphoria-1',
				'indexes.transfer_sender': address,
				'indexes.message_action': '/cosmos.staking.v1beta1.MsgBeginRedelegate',
				// $and: [
				// 	{
				// 		'tx_response.events': {
				// 			$elemMatch: {
				// 				type: 'transfer',
				// 				'attributes.key': toBase64(toUtf8('sender')),
				// 				'attributes.value': toBase64(toUtf8(address)),
				// 			},
				// 		},
				// 	},
				// 	{
				// 		'tx_response.events': {
				// 			$elemMatch: {
				// 				type: 'message',
				// 				'attributes.key': toBase64(toUtf8('action')),
				// 				'attributes.value': toBase64(
				// 					toUtf8('/cosmos.staking.v1beta1.MsgBeginRedelegate'),
				// 				),
				// 			},
				// 		},
				// 	},
				// ],
			};
			let query3 = {
				'tx_response.height': { $lte: toBlock, $gte: fromBlock },
				'custom_info.chain_id': 'euphoria-1',
				'indexes.transfer_sender': address,
				'indexes.message_action': '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
				// $and: [
				// 	{
				// 		'tx_response.events': {
				// 			$elemMatch: {
				// 				type: 'transfer',
				// 				'attributes.key': toBase64(toUtf8('sender')),
				// 				'attributes.value': toBase64(toUtf8(address)),
				// 			},
				// 		},
				// 	},
				// 	{
				// 		'tx_response.events': {
				// 			$elemMatch: {
				// 				type: 'message',
				// 				'attributes.key': toBase64(toUtf8('action')),
				// 				'attributes.value': toBase64(
				// 					toUtf8(
				// 						'/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
				// 					),
				// 				),
				// 			},
				// 		},
				// 	},
				// ],
			};
			let query4 = {
				'tx_response.height': { $lte: toBlock, $gte: 657698 },
				'custom_info.chain_id': 'euphoria-1',
				'indexes.transfer_sender': address,
				$or: [
					{ 'indexes.message_action': '/cosmos.gov.v1beta1.MsgVote' },
					{ 'indexes.message_action': '/cosmos_gov_v1beta1_MsgVote' },
				],
				'indexes.proposal_vote_proposal_id': '5',
			};
			let query5 = {
				'tx_response.height': { $lte: toBlock, $gte: 657698 },
				'custom_info.chain_id': 'euphoria-1',
				'indexes.transfer_sender': address,
				$or: [
					{ 'indexes.message_action': '/cosmos.gov.v1beta1.MsgVote' },
					{ 'indexes.message_action': '/cosmos_gov_v1beta1_MsgVote' },
				],
				'indexes.proposal_vote_proposal_id': '6',
			};
			//case 1
			// let pathAllSendTx = /cosmos/tx/v1beta1/txs?events=tx.height>=${fromBlock}&events=tx.height<=${toBlock}&events=transfer.sender='${address}'&pagination.offset=0&pagination.limit=1&pagination.count_total=true&order_by=ORDER_BY_DESC
			// let pathRedelegateTx = /cosmos/tx/v1beta1/txs?events=tx.height>=${fromBlock}&events=tx.height<=${toBlock}&events=message.action='/cosmos.staking.v1beta1.MsgBeginRedelegate'&events=transfer.sender='${address}'&pagination.offset=0&pagination.limit=1&pagination.count_total=true&order_by=ORDER_BY_DESC
			// let pathWithdraw = /cosmos/tx/v1beta1/txs?events=tx.height>=${fromBlock}&events=tx.height<=${toBlock}&events=message.action='/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward'&events=transfer.sender='${address}'&pagination.offset=0&pagination.limit=1&pagination.count_total=true&order_by=ORDER_BY_DESC;

			// let [result1, result2, result3] = await Promise.all([
			//     this.callApiFromDomain(
			//         url,
			//         pathAllSendTx,
			//     ),
			//     this.callApiFromDomain(
			//         url,
			//         pathRedelegateTx,
			//     ),this.callApiFromDomain(
			//         url,
			//         pathWithdraw,
			//     )
			// ])

			// let element = {
			//     address: address,
			//     noTx: result1.pagination.total,
			//     noRedelegate : result2.pagination.total,
			//     noWithdraw: result3.pagination.total,
			// }
			// listResult.push(element);
			// this.logger.info(result1.pagination.total,' ',result2.pagination.total,' ',result3.pagination.total,' ');

			//case 2
			this.logger.info(query1);
			// let result1: number = await this.adapter.count({query: query1});
			// let result2: number = await this.adapter.count({query: query2});
			// let result3: number = await this.adapter.count({query: query3});
			let [result1, result2, result3, result4, result5] = await Promise.all([
				this.adapter.count({ query: query1 }),
				this.adapter.count({ query: query2 }),
				this.adapter.count({ query: query3 }),
				this.adapter.count({ query: query4 }),
				this.adapter.count({ query: query5 }),
			]);
			let element = {
				address: address,
				noTx: result1,
				noRedelegate: result2,
				noWithdraw: result3,
			};
			listResult.push(element);
			this.logger.info(`${address},${result1},${result2},${result3},${result4},${result5}`);
		});
		this.logger.info(JSON.stringify(listResult));

		return super._start();
	}
	async sleep(ms: any) {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}
}
