import React from "react"
import { Archiver } from "../archiver"
import { Block } from "../block"
import { BlockIcons } from "../blockIcons"
import { IPropertyOption } from "../board"
import { BoardTree } from "../boardTree"
import { CardFilter } from "../cardFilter"
import { Constants } from "../constants"
import { Menu } from "../menu"
import { Mutator } from "../mutator"
import { IBlock } from "../octoTypes"
import { OctoUtils } from "../octoUtils"
import { Utils } from "../utils"
import { BoardCard } from "./boardCard"
import { BoardColumn } from "./boardColumn"
import Button from "./button"
import { Editable } from "./editable"

type Props = {
	mutator: Mutator,
	boardTree?: BoardTree
	showView: (id: string) => void
	showCard: (card: IBlock) => void
	showFilter: (el: HTMLElement) => void
	setSearchText: (text: string) => void
}

type State = {
	isHoverOnCover: boolean
	isSearching: boolean
}

class BoardComponent extends React.Component<Props, State> {
	private draggedCard: IBlock
	private draggedHeaderOption: IPropertyOption
	private searchFieldRef = React.createRef<Editable>()

	constructor(props: Props) {
		super(props)
		this.state = { isHoverOnCover: false, isSearching: !!this.props.boardTree?.getSearchText() }
	}

	componentDidUpdate(prevPros: Props, prevState: State) {
		if (this.state.isSearching && !prevState.isSearching) {
			this.searchFieldRef.current.focus()
		}
	}

	render() {
		const { mutator, boardTree, showView } = this.props

		if (!boardTree || !boardTree.board) {
			return (
				<div>Loading...</div>
			)
		}

		const propertyValues = boardTree.groupByProperty?.options || []
		console.log(`${propertyValues.length} propertyValues`)

		const groupByStyle = { color: "#000000" }
		const { board, activeView } = boardTree
		const visiblePropertyTemplates = board.cardProperties.filter(template => activeView.visiblePropertyIds.includes(template.id))
		const hasFilter = activeView.filter && activeView.filter.filters?.length > 0
		const hasSort = activeView.sortOptions.length > 0

		return (
			<div className="octo-app">
				<div className="octo-frame">
					<div
						className="octo-hovercontrols"
						onMouseOver={() => { this.setState({ ...this.state, isHoverOnCover: true }) }}
						onMouseLeave={() => { this.setState({ ...this.state, isHoverOnCover: false }) }}
					>
						<Button
							style={{ display: (!board.icon && this.state.isHoverOnCover) ? null : "none" }}
							onClick={() => {
								const newIcon = BlockIcons.shared.randomIcon()
								mutator.changeIcon(board, newIcon)
							}}
						>Add Icon</Button>
					</div>

					<div className="octo-icontitle">
						{board.icon ?
							<div className="octo-button octo-icon" onClick={(e) => { this.iconClicked(e) }}>{board.icon}</div>
							: undefined}
						<Editable className="title" text={board.title} placeholderText="Untitled Board" onChanged={(text) => { mutator.changeTitle(board, text) }} />
					</div>

					<div className="octo-board">
						<div className="octo-controls">
							<Editable style={{ color: "#000000", fontWeight: 600 }} text={activeView.title} placeholderText="Untitled View" onChanged={(text) => { mutator.changeTitle(activeView, text) }} />
							<div className="octo-button" style={{ color: "#000000", fontWeight: 600 }} onClick={(e) => { OctoUtils.showViewMenu(e, mutator, boardTree, showView) }}><div className="imageDropdown"></div></div>
							<div className="octo-spacer"></div>
							<div className="octo-button" onClick={(e) => { this.propertiesClicked(e) }}>Properties</div>
							<div className="octo-button" id="groupByButton" onClick={(e) => { this.groupByClicked(e) }}>
								Group by <span style={groupByStyle} id="groupByLabel">{boardTree.groupByProperty?.name}</span>
							</div>
							<div className={hasFilter ? "octo-button active" : "octo-button"} onClick={(e) => { this.filterClicked(e) }}>Filter</div>
							<div className={hasSort ? "octo-button active" : "octo-button"} onClick={(e) => { OctoUtils.showSortMenu(e, mutator, boardTree) }}>Sort</div>
							{this.state.isSearching
								? <Editable
									ref={this.searchFieldRef}
									text={boardTree.getSearchText()}
									placeholderText="Search text"
									style={{ color: "#000000" }}
									onChanged={(text) => { this.searchChanged(text) }}
									onKeyDown={(e) => { this.onSearchKeyDown(e) }}></Editable>
								: <div className="octo-button" onClick={() => { this.setState({ ...this.state, isSearching: true }) }}>Search</div>
							}
							<div className="octo-button" onClick={(e) => { this.optionsClicked(e) }}><div className="imageOptions" /></div>
							<div className="octo-button filled" onClick={() => { this.addCard(undefined) }}>New</div>
						</div>

						{/* Headers */}

						<div className="octo-board-header" id="mainBoardHeader">

							{/* No value */}

							<div className="octo-board-header-cell">
								<div className="octo-label" title={`Items with an empty ${boardTree.groupByProperty?.name} property will go here. This column cannot be removed.`}>{`No ${boardTree.groupByProperty?.name}`}</div>
								<Button text={`${boardTree.emptyGroupCards.length}`} />
								<div className="octo-spacer" />
								<Button><div className="imageOptions" /></Button>
								<Button onClick={() => { this.addCard(undefined) }}><div className="imageAdd" /></Button>
							</div>

							{boardTree.groups.map(group =>
								<div
									key={group.option.value}
									className="octo-board-header-cell"

									draggable={true}
									onDragStart={() => { this.draggedHeaderOption = group.option }}
									onDragEnd={() => { this.draggedHeaderOption = undefined }}

									onDragOver={(e) => { e.preventDefault(); (e.target as HTMLElement).classList.add("dragover") }}
									onDragEnter={(e) => { e.preventDefault(); (e.target as HTMLElement).classList.add("dragover") }}
									onDragLeave={(e) => { e.preventDefault(); (e.target as HTMLElement).classList.remove("dragover") }}
									onDrop={(e) => { e.preventDefault(); (e.target as HTMLElement).classList.remove("dragover"); this.onDropToColumn(group.option) }}
								>
									<Editable
										className={`octo-label ${group.option.color}`}
										text={group.option.value}
										onChanged={(text) => { this.propertyNameChanged(group.option, text) }} />
									<Button text={`${group.cards.length}`} />
									<div className="octo-spacer" />
									<Button onClick={(e) => { this.valueOptionClicked(e, group.option) }}><div className="imageOptions" /></Button>
									<Button onClick={() => { this.addCard(group.option.value) }}><div className="imageAdd" /></Button>
								</div>
							)}

							<div className="octo-board-header-cell">
								<Button text="+ Add a group" onClick={(e) => { this.addGroupClicked() }} />
							</div>
						</div>

						{/* Main content */}

						<div className="octo-board-body" id="mainBoardBody">

							{/* No value column */}

							<BoardColumn onDrop={(e) => { this.onDropToColumn(undefined) }}>
								{boardTree.emptyGroupCards.map(card =>
									<BoardCard
										mutator={mutator}
										card={card}
										visiblePropertyTemplates={visiblePropertyTemplates}
										key={card.id}
										onClick={() => { this.showCard(card) }}
										onDragStart={() => { this.draggedCard = card }}
										onDragEnd={() => { this.draggedCard = undefined }} />
								)}
								<Button text="+ New" onClick={() => { this.addCard(undefined) }} />
							</BoardColumn>

							{/* Columns */}

							{boardTree.groups.map(group =>
								<BoardColumn onDrop={(e) => { this.onDropToColumn(group.option) }} key={group.option.value}>
									{group.cards.map(card =>
										<BoardCard
											mutator={mutator}
											card={card}
											visiblePropertyTemplates={visiblePropertyTemplates}
											key={card.id}
											onClick={() => { this.showCard(card) }}
											onDragStart={() => { this.draggedCard = card }}
											onDragEnd={() => { this.draggedCard = undefined }} />
									)}
									<Button text="+ New" onClick={() => { this.addCard(group.option.value) }} />
								</BoardColumn>
							)}
						</div>
					</div>
				</div>
			</div>
		)
	}

	private iconClicked(e: React.MouseEvent) {
		const { mutator, boardTree } = this.props
		const { board } = boardTree

		Menu.shared.options = [
			{ id: "random", name: "Random" },
			{ id: "remove", name: "Remove Icon" },
		]
		Menu.shared.onMenuClicked = (optionId: string, type?: string) => {
			switch (optionId) {
				case "remove":
					mutator.changeIcon(board, undefined, "remove icon")
					break
				case "random":
					const newIcon = BlockIcons.shared.randomIcon()
					mutator.changeIcon(board, newIcon)
					break
			}
		}
		Menu.shared.showAtElement(e.target as HTMLElement)
	}

	async showCard(card?: IBlock) {
		console.log(`showCard: ${card?.title}`)

		await this.props.showCard(card)
	}

	async addCard(groupByValue?: string) {
		const { mutator, boardTree } = this.props
		const { activeView, board } = boardTree

		const properties = CardFilter.propertiesThatMeetFilterGroup(activeView.filter, board.cardProperties)
		const card = new Block({ type: "card", parentId: boardTree.board.id, properties })
		if (boardTree.groupByProperty) {
			card.properties[boardTree.groupByProperty.id] = groupByValue
		}
		await mutator.insertBlock(card, "add card", async () => { await this.showCard(card) }, async () => { await this.showCard(undefined) })
	}

	async propertyNameChanged(option: IPropertyOption, text: string) {
		const { mutator, boardTree } = this.props

		await mutator.changePropertyOptionValue(boardTree, boardTree.groupByProperty, option, text)
	}

	async valueOptionClicked(e: React.MouseEvent<HTMLElement>, option: IPropertyOption) {
		const { mutator, boardTree } = this.props

		Menu.shared.options = [
			{ id: "delete", name: "Delete" },
			{ id: "", name: "", type: "separator" },
			...Constants.menuColors
		]
		Menu.shared.onMenuClicked = async (optionId: string, type?: string) => {
			switch (optionId) {
				case "delete":
					console.log(`Delete property value: ${option.value}`)
					await mutator.deletePropertyOption(boardTree, boardTree.groupByProperty, option)
					break
				default:
					if (type === "color") {
						// id is the color
						await mutator.changePropertyOptionColor(boardTree.board, option, optionId)
						break
					}
			}
		}
		Menu.shared.showAtElement(e.target as HTMLElement)
	}

	private filterClicked(e: React.MouseEvent) {
		this.props.showFilter(e.target as HTMLElement)
	}

	private async optionsClicked(e: React.MouseEvent) {
		const { boardTree } = this.props

		Menu.shared.options = [
			{ id: "exportBoardArchive", name: "Export board archive" },
			{ id: "testAdd100Cards", name: "TEST: Add 100 cards" },
			{ id: "testAdd1000Cards", name: "TEST: Add 1,000 cards" },
		]

		Menu.shared.onMenuClicked = async (id: string) => {
			switch (id) {
				case "exportBoardArchive": {
					Archiver.exportBoardTree(boardTree)
					break
				}
				case "testAdd100Cards": {
					this.testAddCards(100)
				}
				case "testAdd1000Cards": {
					this.testAddCards(1000)
				}
			}
		}
		Menu.shared.showAtElement(e.target as HTMLElement)
	}

	private async testAddCards(count: number) {
		const { mutator, boardTree } = this.props
		const { board, activeView } = boardTree

		let optionIndex = 0

		for (let i = 0; i < count; i++) {
			const properties = CardFilter.propertiesThatMeetFilterGroup(activeView.filter, board.cardProperties)
			const card = new Block({ type: "card", parentId: boardTree.board.id, properties })
			if (boardTree.groupByProperty && boardTree.groupByProperty.options.length > 0) {
				// Cycle through options
				const option = boardTree.groupByProperty.options[optionIndex]
				optionIndex = (optionIndex + 1) % boardTree.groupByProperty.options.length
				card.properties[boardTree.groupByProperty.id] = option.value
				card.title = `Test Card ${i + 1}`
			}
			await mutator.insertBlock(card, "test add card")
		}
	}

	private async propertiesClicked(e: React.MouseEvent) {
		const { mutator, boardTree } = this.props
		const { activeView } = boardTree

		const selectProperties = boardTree.board.cardProperties
		Menu.shared.options = selectProperties.map((o) => {
			const isVisible = activeView.visiblePropertyIds.includes(o.id)
			return { id: o.id, name: o.name, type: "switch", isOn: isVisible }
		})

		Menu.shared.onMenuToggled = async (id: string, isOn: boolean) => {
			const property = selectProperties.find(o => o.id === id)
			Utils.assertValue(property)
			Utils.log(`Toggle property ${property.name} ${isOn}`)

			let newVisiblePropertyIds = []
			if (activeView.visiblePropertyIds.includes(id)) {
				newVisiblePropertyIds = activeView.visiblePropertyIds.filter(o => o !== id)
			} else {
				newVisiblePropertyIds = [...activeView.visiblePropertyIds, id]
			}
			await mutator.changeViewVisibleProperties(activeView, newVisiblePropertyIds)
		}
		Menu.shared.showAtElement(e.target as HTMLElement)
	}

	private async groupByClicked(e: React.MouseEvent) {
		const { mutator, boardTree } = this.props

		const selectProperties = boardTree.board.cardProperties.filter(o => o.type === "select")
		Menu.shared.options = selectProperties.map((o) => { return { id: o.id, name: o.name } })
		Menu.shared.onMenuClicked = async (command: string) => {
			if (boardTree.activeView.groupById === command) { return }

			await mutator.changeViewGroupById(boardTree.activeView, command)
		}
		Menu.shared.showAtElement(e.target as HTMLElement)
	}

	async addGroupClicked() {
		console.log(`onAddGroupClicked`)

		const { mutator, boardTree } = this.props

		const option: IPropertyOption = {
			value: "New group",
			color: "#cccccc"
		}

		await mutator.insertPropertyOption(boardTree, boardTree.groupByProperty, option, "add group")
	}

	async onDropToColumn(option: IPropertyOption) {
		const { mutator, boardTree } = this.props
		const { draggedCard, draggedHeaderOption } = this
		const propertyValue = option ? option.value : undefined

		Utils.assertValue(mutator)
		Utils.assertValue(boardTree)

		if (draggedCard) {
			Utils.log(`ondrop. Card: ${draggedCard.title}, column: ${propertyValue}`)
			const oldValue = draggedCard.properties[boardTree.groupByProperty.id]
			if (propertyValue !== oldValue) {
				await mutator.changePropertyValue(draggedCard, boardTree.groupByProperty.id, propertyValue, "drag card")
			}
		} else if (draggedHeaderOption) {
			Utils.log(`ondrop. Header option: ${draggedHeaderOption.value}, column: ${propertyValue}`)
			Utils.assertValue(boardTree.groupByProperty)

			// Move option to new index
			const { board } = boardTree
			const options = boardTree.groupByProperty.options
			const destIndex = option ? options.indexOf(option) : 0

			await mutator.changePropertyOptionOrder(board, boardTree.groupByProperty, draggedHeaderOption, destIndex)
		}
	}

	onSearchKeyDown(e: React.KeyboardEvent) {
		if (e.keyCode === 27) {		// ESC: Clear search
			this.searchFieldRef.current.text = ""
			this.setState({ ...this.state, isSearching: false })
			this.props.setSearchText(undefined)
			e.preventDefault()
		}
	}

	searchChanged(text?: string) {
		this.props.setSearchText(text)
	}
}

export { BoardComponent }
